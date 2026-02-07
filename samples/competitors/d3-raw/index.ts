import { select, pointer } from "d3-selection";
import { scaleTime, scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { line, curveLinear } from "d3-shape";
import { zoom, zoomIdentity } from "d3-zoom";
import type { D3ZoomEvent } from "d3-zoom";
import { brushX } from "d3-brush";
import type { D3BrushEvent } from "d3-brush";
import { timeFormat } from "d3-time-format";
import { csv } from "d3-fetch";
import { SegmentTree } from "segment-tree-rmq";
import { bisector } from "d3-array";
import { measure } from "../../measure.ts";

// Resize handling
interface Resize {
  interval: number;
  request: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | null;
  eval: (() => void) | null;
}

const resize: Resize = { interval: 60, request: null, timer: null, eval: null };
let resizeListener: (() => void) | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

interface IMinMax {
  readonly min: number;
  readonly max: number;
}

const minMaxIdentity: IMinMax = {
  min: Infinity,
  max: -Infinity,
};

function buildMinMax(fst: Readonly<IMinMax>, snd: Readonly<IMinMax>): IMinMax {
  return {
    min: Math.min(fst.min, snd.min),
    max: Math.max(fst.max, snd.max),
  } as const;
}

// Chart configuration
const margin = { top: 20, right: 20, bottom: 30, left: 40 };

// Dynamic sizing based on container
function getContainerDimensions(): {
  containerWidth: number;
  containerHeight: number;
  width: number;
  height: number;
} {
  const container = document.querySelector(".chart-drawing");
  const containerWidth = container?.clientWidth ?? 800;
  const containerHeight = container?.clientHeight ?? 400;
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  return { containerWidth, containerHeight, width, height };
}

// Parse CSV temperature value - takes first value from "min;mid;max" format
function parseTemp(value: string | undefined): number {
  if (!value || value.trim() === "") return NaN;
  const parts = value.split(";");
  // Use first temperature value
  const firstValue = parts[0];
  return parseFloat(firstValue ?? "");
}

// Series interface
interface Series {
  id: number;
  name: string;
  values: number[];
  dates: Date[];
  color: string;
}

// Load and parse CSV data
async function loadData(): Promise<{
  series: Series[];
  dates: Date[];
}> {
  const rows = (await csv("../../demos/ny-vs-sf.csv")) as {
    NY: string;
    SF: string;
  }[];

  const startTime = Date.now();
  const timeStep = 86400000; // 1 day in milliseconds

  const dates: Date[] = [];
  const nyValues: number[] = [];
  const sfValues: number[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    dates.push(new Date(startTime + i * timeStep));
    nyValues.push(parseTemp(row.NY));
    sfValues.push(parseTemp(row.SF));
  }

  const colors = ["rgb(136, 204, 91)", "rgb(96, 77, 196)"];
  const seriesData: Series[] = [
    { id: 0, name: "New York", values: nyValues, dates, color: colors[0]! },
    {
      id: 1,
      name: "San Francisco",
      values: sfValues,
      dates,
      color: colors[1]!,
    },
  ];

  return { series: seriesData, dates };
}

// Initialize chart with loaded data
async function initChart(): Promise<void> {
  const { series, dates } = await loadData();
  const chartControls = drawChart(series, dates);

  // Dynamic data update - cycle through loaded data and append new points every 5 seconds
  if (intervalId) {
    clearInterval(intervalId);
  }
  let j = 0;
  const originalData = { series, dates };
  intervalId = setInterval(function () {
    const dataIndex = j % originalData.dates.length;
    const newDate = new Date(
      dates[dates.length - 1]!.getTime() +
        (dates[1]!.getTime() - dates[0]!.getTime()),
    );
    const newNyValue = originalData.series[0]!.values[dataIndex]!;
    const newSfValue = originalData.series[1]!.values[dataIndex]!;

    // Add new data point to each series
    chartControls.addDataPoint(newDate, [newNyValue, newSfValue]);
    j++;
  }, 5000);

  // Setup resize handling
  resize.request = function () {
    if (resize.timer) clearTimeout(resize.timer);
    resize.timer = setTimeout(() => {
      resize.eval?.();
    }, resize.interval);
  };
  resize.eval = function () {
    // Clear existing chart and redraw
    select("#chart").selectAll("*").remove();
    drawChart(series, dates);
  };

  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
  }
  resizeListener = () => resize.request?.();
  window.addEventListener("resize", resizeListener);
}

// Chart control interface
interface ChartControls {
  addDataPoint: (date: Date, values: number[]) => void;
}

// Draw chart with series data
function drawChart(series: Series[], dates: Date[]): ChartControls {
  const { containerWidth, containerHeight, width, height } =
    getContainerDimensions();
  let numDataPoints = dates.length;
  const numSeries = series.length;

  // Build joint min/max data for all series at each time slot
  const jointMinMaxData: IMinMax[] = [];
  for (let timeIndex = 0; timeIndex < numDataPoints; timeIndex++) {
    const minMaxValues: IMinMax[] = series.map((s) => {
      const v = s.values[timeIndex];
      return Number.isFinite(v) ? { min: v!, max: v! } : minMaxIdentity;
    });
    const minMax = minMaxValues.reduce(buildMinMax, minMaxIdentity);
    jointMinMaxData.push(minMax);
  }

  // Create segment tree using the same pattern as demo1
  let jointSegmentTree = new SegmentTree(
    jointMinMaxData,
    buildMinMax,
    minMaxIdentity,
  );

  // Get global extent from the tree root
  let yExtent = (() => {
    const result = jointSegmentTree.query(0, numDataPoints - 1);
    return [result.min, result.max] as [number, number];
  })();

  // Add some padding to y extent
  let yPadding = (yExtent[1] - yExtent[0]) * 0.1;
  let yDomain: [number, number] = [
    yExtent[0] - yPadding,
    yExtent[1] + yPadding,
  ];

  // Time domain from dates
  let originTime = dates[0]!;
  let endTime = dates[dates.length - 1]!;

  // Calculate slot interval in milliseconds (average time between data points)
  let slotInterval =
    (endTime.getTime() - originTime.getTime()) / (numDataPoints - 1);

  // Function to calculate visible range extent using segment tree
  function getVisibleYExtent(xDomainRange: [Date, Date]): [number, number] {
    const startTimeMs = xDomainRange[0].getTime();
    const endTimeMs = xDomainRange[1].getTime();

    // Convert time range to data indices
    const startIndex = Math.max(
      0,
      Math.floor((startTimeMs - originTime.getTime()) / slotInterval),
    );
    const endIndex = Math.min(
      numDataPoints - 1,
      Math.ceil((endTimeMs - originTime.getTime()) / slotInterval),
    );

    if (startIndex >= endIndex) return yDomain;

    // Query segment tree for the visible range
    const result = jointSegmentTree.query(startIndex, endIndex);

    // Add padding to the visible extent
    const range = result.max - result.min;
    const padding = range * 0.1;

    return [result.min - padding, result.max + padding];
  }

  // Create SVG with proper sizing
  const svg = select("#chart")
    .attr("width", containerWidth)
    .attr("height", containerHeight)
    .style("max-width", "100%")
    .style("height", "auto");

  const g = svg
    .append("g")
    .attr(
      "transform",
      `translate(${String(margin.left)},${String(margin.top)})`,
    );

  // Create scales
  const xScale = scaleTime().domain([originTime, endTime]).range([0, width]);

  const yScale = scaleLinear().domain(yDomain).range([height, 0]);

  // Store original domains for reset functionality (mutable for dynamic data updates)
  let originalXDomain = xScale.domain() as [Date, Date];
  let originalYDomain = yScale.domain() as [number, number];

  // Current visible range (for calculating normalized coordinates)
  let currentXDomain: [Date, Date] = [...originalXDomain];
  let currentYDomain: [number, number] = [...originalYDomain];

  // Create axes
  const formatDate = timeFormat("%b %d");
  const xAxis = axisBottom(xScale).tickFormat((d) => formatDate(d as Date));

  const yAxis = axisLeft(yScale);

  // Create axis groups
  const xAxisGroup = g
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${String(height)})`);

  const yAxisGroup = g.append("g").attr("class", "axis");

  // Create grid groups
  const gridGroup = g.append("g").attr("class", "grid");

  // Function to update grid lines
  function updateGrid(): void {
    gridGroup.selectAll(".grid-line").remove();

    gridGroup
      .selectAll(".grid-line.horizontal")
      .data(yScale.ticks(10))
      .enter()
      .append("line")
      .attr("class", "grid-line horizontal")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d));

    gridGroup
      .selectAll(".grid-line.vertical")
      .data(xScale.ticks(10))
      .enter()
      .append("line")
      .attr("class", "grid-line vertical")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", height);
  }

  // Function to update axes
  function updateAxes(): void {
    xAxisGroup.call(xAxis);
    yAxisGroup.call(yAxis);
    yAxisGroup
      .selectAll(".tick text")
      .attr("text-anchor", "start")
      .attr("x", 9);
    updateGrid();
  }

  // Initial render of axes and grid
  updateAxes();

  // Create line generator without x/y accessors
  // Use .defined() to skip null values and create gaps for missing data (like demo1)
  const lineFn = line<[number, number] | null>()
    .defined((d) => d !== null)
    .curve(curveLinear);

  // Create clipping path
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", "chart-clip")
    .append("rect")
    .attr("width", width)
    .attr("height", height);

  // Create lines container with clipping
  const linesContainer = g
    .append("g")
    .attr("class", "lines")
    .attr("clip-path", "url(#chart-clip)");

  // Function to get normalized coordinates for current domain
  // Keep null values to create gaps in the line (like demo1)
  function getNormalizedCoordinates(
    seriesData: Series,
  ): ([number, number] | null)[] {
    return seriesData.values.map((value, index) => {
      if (!Number.isFinite(value)) return null;
      const timeValue = seriesData.dates[index]!.getTime();
      const normalizedX =
        (timeValue - currentXDomain[0].getTime()) /
        (currentXDomain[1].getTime() - currentXDomain[0].getTime());
      const normalizedY =
        (value - currentYDomain[0]) / (currentYDomain[1] - currentYDomain[0]);
      return [normalizedX, normalizedY] as [number, number];
    });
  }

  // Function to update lines based on current domain
  function updateLines(): void {
    const lineGroups = linesContainer
      .selectAll<SVGGElement, Series>(".line-group")
      .data(series);

    const lineGroupEnter = lineGroups
      .enter()
      .append("g")
      .attr("class", "line-group");

    lineGroupEnter
      .append("g")
      .attr("class", "scaled-group")
      .attr(
        "transform",
        `scale(${String(width)}, ${String(-height)}) translate(0, -1)`,
      )
      .append("path")
      .attr("fill", "none")
      .attr("stroke-width", 1)
      .attr("vector-effect", "non-scaling-stroke");

    // Update all line groups
    linesContainer
      .selectAll<SVGGElement, Series>(".line-group")
      .each(function (d) {
        const pathData = getNormalizedCoordinates(d);

        select(this)
          .select<SVGPathElement>("path")
          .datum(pathData)
          .attr("d", lineFn)
          .attr("stroke", d.color);
      });
  }

  // Initial render of lines
  updateLines();

  // Interactive legend setup (using sidebar legend like demo1)
  const legendTimeEl = select(".chart-legend__time");
  const legendNyEl = select(".chart-legend__green_value");
  const legendSfEl = select(".chart-legend__blue_value");

  // Create highlight dots for hover
  const highlightDots = series.map((s) => {
    return linesContainer
      .append("circle")
      .attr("class", "highlight-dot")
      .attr("r", 2)
      .attr("fill", s.color)
      .attr("stroke", s.color)
      .style("display", "none");
  });

  // Bisector for finding nearest data point by date
  const dateBisector = bisector<Date, Date>((d) => d);

  // Track mouse position for updating legend after data changes
  let lastMouseX: number | null = null;
  let isHovering = false;

  // Function to interpolate value between two data points
  function interpolateValue(
    seriesData: Series,
    targetDate: Date,
  ): number | null {
    const targetTime = targetDate.getTime();
    const idx = dateBisector.left(seriesData.dates, targetDate, 1);

    if (idx === 0) {
      const val = seriesData.values[0];
      return val !== undefined && Number.isFinite(val) ? val : null;
    }
    if (idx >= seriesData.dates.length) {
      const val = seriesData.values[seriesData.dates.length - 1];
      return val !== undefined && Number.isFinite(val) ? val : null;
    }

    const d0 = seriesData.dates[idx - 1]!;
    const d1 = seriesData.dates[idx]!;
    const v0 = seriesData.values[idx - 1]!;
    const v1 = seriesData.values[idx]!;

    if (!Number.isFinite(v0) || !Number.isFinite(v1)) {
      // Return the nearest finite value
      if (Number.isFinite(v0)) return v0;
      if (Number.isFinite(v1)) return v1;
      return null;
    }

    // Linear interpolation
    const t = (targetTime - d0.getTime()) / (d1.getTime() - d0.getTime());
    return v0 + t * (v1 - v0);
  }

  // Function to update legend with hover values
  function updateLegend(mouseX: number): void {
    // Convert screen X to date
    const hoverDate = xScale.invert(mouseX);

    // Clamp to data range
    if (hoverDate < currentXDomain[0] || hoverDate > currentXDomain[1]) {
      clearLegend();
      return;
    }

    // Update time display
    legendTimeEl.text(hoverDate.toLocaleString());

    // Update values and dots for each series
    series.forEach((s, i) => {
      const value = interpolateValue(s, hoverDate);
      const legendEl = i === 0 ? legendNyEl : legendSfEl;
      const dot = highlightDots[i]!;

      if (value !== null) {
        legendEl.text(Math.round(value).toString());
        dot
          .attr("cx", xScale(hoverDate))
          .attr("cy", yScale(value))
          .style("display", null);
      } else {
        legendEl.text(" ");
        dot.style("display", "none");
      }
    });
  }

  // Function to clear legend
  function clearLegend(): void {
    legendTimeEl.text("");
    legendNyEl.text("");
    legendSfEl.text("");
    highlightDots.forEach((dot) => dot.style("display", "none"));
  }

  // Create zoom behavior with constrained extent
  const zoomBehavior = zoom<SVGRectElement, unknown>()
    .scaleExtent([1, 50])
    .translateExtent([
      [0, 0],
      [width, height],
    ])
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("zoom", function (event: D3ZoomEvent<SVGRectElement, unknown>) {
      const transform = event.transform;

      // Calculate potential new X domain
      const potentialXDomain = transform
        .rescaleX(scaleTime().domain(originalXDomain).range([0, width]))
        .domain() as [Date, Date];

      // Constrain X domain to data boundaries
      const dataStartTime = originalXDomain[0];
      const dataEndTime = originalXDomain[1];

      const constrainedXDomain: [Date, Date] = [...potentialXDomain];

      // Prevent zooming out beyond original data range
      if (constrainedXDomain[0] < dataStartTime) {
        const shift = dataStartTime.getTime() - constrainedXDomain[0].getTime();
        constrainedXDomain[0] = dataStartTime;
        constrainedXDomain[1] = new Date(
          constrainedXDomain[1].getTime() + shift,
        );
      }

      if (constrainedXDomain[1] > dataEndTime) {
        const shift = constrainedXDomain[1].getTime() - dataEndTime.getTime();
        constrainedXDomain[1] = dataEndTime;
        constrainedXDomain[0] = new Date(
          constrainedXDomain[0].getTime() - shift,
        );
      }

      // Ensure we don't exceed original bounds after adjustment
      if (constrainedXDomain[0] < dataStartTime) {
        constrainedXDomain[0] = dataStartTime;
      }
      if (constrainedXDomain[1] > dataEndTime) {
        constrainedXDomain[1] = dataEndTime;
      }

      // Calculate Y domain using segment tree for constrained range
      const newYDomain = getVisibleYExtent(constrainedXDomain);

      // Update current domains
      currentXDomain = constrainedXDomain;
      currentYDomain = newYDomain;

      // Update scales
      xScale.domain(constrainedXDomain);
      yScale.domain(newYDomain);

      // Re-render everything
      updateAxes();
      updateLines();
    });

  // Create brush
  const brush = brushX<unknown>()
    .extent([
      [0, 0],
      [width, height],
    ])
    .on("end", function (event: D3BrushEvent<unknown>) {
      if (!event.selection) return;

      const [x0, x1] = event.selection as [number, number];
      const timeRange = [xScale.invert(x0), xScale.invert(x1)] as [Date, Date];

      // Constrain selection to data boundaries
      const dataStartTime = originalXDomain[0];
      const dataEndTime = originalXDomain[1];

      const constrainedTimeRange: [Date, Date] = [
        new Date(Math.max(timeRange[0].getTime(), dataStartTime.getTime())),
        new Date(Math.min(timeRange[1].getTime(), dataEndTime.getTime())),
      ];

      // Only proceed if we have a valid time range
      if (constrainedTimeRange[0] >= constrainedTimeRange[1]) {
        brushGroup.call(brush.clear.bind(brush));
        return;
      }

      // Log selection info
      const formatDateFull = timeFormat("%b %d, %Y");
      const startTimeStr = formatDateFull(constrainedTimeRange[0]);
      const endTimeStr = formatDateFull(constrainedTimeRange[1]);
      console.log(`Selection: ${startTimeStr} - ${endTimeStr}`);

      // Calculate Y extent for the constrained range using segment tree
      const newXDomain = constrainedTimeRange;
      const newYDomain = getVisibleYExtent(newXDomain);

      // Update domains
      currentXDomain = newXDomain;
      currentYDomain = newYDomain;
      xScale.domain(newXDomain);
      yScale.domain(newYDomain);

      updateAxes();
      updateLines();

      // Sync zoom transform to match the new domain so pan/zoom works correctly
      // Calculate the scale factor and translation for the zoom transform
      const fullRange =
        originalXDomain[1].getTime() - originalXDomain[0].getTime();
      const newRange = newXDomain[1].getTime() - newXDomain[0].getTime();
      const k = fullRange / newRange;
      const tx =
        -(
          (newXDomain[0].getTime() - originalXDomain[0].getTime()) /
          fullRange
        ) *
        width *
        k;
      const newTransform = zoomIdentity.translate(tx, 0).scale(k);

      // Apply the transform to the zoom overlay without triggering the zoom event
      zoomOverlay.call(zoomBehavior.transform.bind(zoomBehavior), newTransform);

      // Clear brush
      brushGroup.call(brush.clear.bind(brush));
    });

  // Add zoom overlay (positioned correctly within the chart area)
  const zoomOverlay = g
    .append("rect")
    .attr("class", "zoom-overlay")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(zoomBehavior)
    .on("mousemove", (event: MouseEvent) => {
      const [x] = pointer(event, event.currentTarget as Element);
      lastMouseX = x;
      isHovering = true;
      updateLegend(x);
    })
    .on("mouseleave", function () {
      isHovering = false;
      lastMouseX = null;
      clearLegend();
    });

  // Add brush group (initially hidden)
  const brushGroup = g
    .append("g")
    .attr("class", "brush")
    .style("display", "none")
    .call(brush);

  // Control functions
  let brushEnabled = false;

  function resetZoom(): void {
    currentXDomain = [...originalXDomain];
    currentYDomain = [...originalYDomain];
    xScale.domain(originalXDomain);
    yScale.domain(originalYDomain);

    updateAxes();
    updateLines();

    // Reset zoom transform
    svg
      .select<SVGRectElement>(".zoom-overlay")
      .call(zoomBehavior.transform.bind(zoomBehavior), zoomIdentity);
  }

  function toggleBrush(): void {
    brushEnabled = !brushEnabled;
    const button = document.getElementById("toggle-brush")!;

    if (brushEnabled) {
      brushGroup.style("display", null);
      zoomOverlay.style("pointer-events", "none").style("cursor", "default");
      button.textContent = "Disable Brush";
    } else {
      brushGroup.style("display", "none");
      zoomOverlay.style("pointer-events", "all").style("cursor", "grab");
      button.textContent = "Enable Brush";
    }
  }

  // Attach event listeners to buttons
  document.getElementById("reset-zoom")?.addEventListener("click", resetZoom);
  document
    .getElementById("toggle-brush")
    ?.addEventListener("click", toggleBrush);

  // Function to add new data point dynamically (sliding window - removes first, adds last)
  function addDataPoint(date: Date, values: number[]): void {
    // Capture old origin time before modifying data
    const oldOriginTime = originTime;

    // Remove oldest data point (sliding window behavior, matching demo1)
    dates.shift();
    series.forEach((s) => {
      s.values.shift();
    });
    jointMinMaxData.shift();

    // Add date to the dates array (series share this reference, so only push once)
    dates.push(date);

    // Add values to each series (don't push to s.dates since it's the same array as dates)
    series.forEach((s, i) => {
      const value = values[i] ?? NaN;
      s.values.push(value);
    });

    // Number of data points stays the same (sliding window)
    numDataPoints = dates.length;

    // Calculate new min/max for the new data point
    const minMaxValues: IMinMax[] = values.map((v) =>
      Number.isFinite(v) ? { min: v, max: v } : minMaxIdentity,
    );
    const newMinMax = minMaxValues.reduce(buildMinMax, minMaxIdentity);
    jointMinMaxData.push(newMinMax);

    // Rebuild segment tree with new data
    jointSegmentTree = new SegmentTree(
      jointMinMaxData,
      buildMinMax,
      minMaxIdentity,
    );

    // Update time domain (sliding window - origin moves forward)
    originTime = dates[0]!;
    endTime = date;
    slotInterval =
      (endTime.getTime() - originTime.getTime()) / (numDataPoints - 1);

    // Calculate how much time has shifted (one data point removed from start, one added at end)
    const timeShift = originTime.getTime() - oldOriginTime.getTime();

    // Recalculate y extent
    yExtent = (() => {
      const result = jointSegmentTree.query(0, numDataPoints - 1);
      return [result.min, result.max] as [number, number];
    })();

    yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    yDomain = [yExtent[0] - yPadding, yExtent[1] + yPadding];

    // Update original domains to reflect new full data range
    originalXDomain = [originTime, endTime];
    originalYDomain = yDomain;

    // Preserve zoom/pan state by shifting the current view window by the same amount
    // This keeps the user looking at the same relative portion of data
    const wasAtOriginalDomain =
      currentXDomain[0].getTime() === oldOriginTime.getTime() &&
      currentXDomain[1].getTime() === endTime.getTime() - slotInterval;

    if (wasAtOriginalDomain) {
      // If user was viewing the full domain, keep viewing the full domain
      currentXDomain = [...originalXDomain];
    } else {
      // Shift the current view window forward by the time shift to maintain relative position
      currentXDomain = [
        new Date(currentXDomain[0].getTime() + timeShift),
        new Date(currentXDomain[1].getTime() + timeShift),
      ];

      // Clamp to data boundaries
      if (currentXDomain[0] < originalXDomain[0]) {
        const adjustment =
          originalXDomain[0].getTime() - currentXDomain[0].getTime();
        currentXDomain[0] = originalXDomain[0];
        currentXDomain[1] = new Date(currentXDomain[1].getTime() + adjustment);
      }
      if (currentXDomain[1] > originalXDomain[1]) {
        const adjustment =
          currentXDomain[1].getTime() - originalXDomain[1].getTime();
        currentXDomain[1] = originalXDomain[1];
        currentXDomain[0] = new Date(currentXDomain[0].getTime() - adjustment);
      }
      // Final clamp
      if (currentXDomain[0] < originalXDomain[0]) {
        currentXDomain[0] = originalXDomain[0];
      }
      if (currentXDomain[1] > originalXDomain[1]) {
        currentXDomain[1] = originalXDomain[1];
      }
    }

    // Recalculate Y domain for the current visible X range
    currentYDomain = getVisibleYExtent(currentXDomain);

    xScale.domain(currentXDomain);
    yScale.domain(currentYDomain);

    // Re-render
    updateAxes();
    updateLines();

    // Update legend if mouse is hovering over the chart
    if (isHovering && lastMouseX !== null) {
      updateLegend(lastMouseX);
    }

    console.log(`Added new data point: ${date.toISOString().slice(0, 10)}`);
  }

  console.log("Chart loaded with NY vs SF temperature data:");
  console.log(`- ${String(numDataPoints)} data points`);
  console.log(`- ${String(numSeries)} series (New York, San Francisco)`);
  console.log(
    `- Temperature range: ${yExtent[0].toFixed(1)}°F - ${yExtent[1].toFixed(1)}°F`,
  );
  console.log(
    `- Date range: ${originTime.toISOString().slice(0, 10)} to ${endTime.toISOString().slice(0, 10)}`,
  );

  // Start FPS monitoring
  measure(3, ({ fps }) => {
    const fpsElement = document.getElementById("fps");
    if (fpsElement) {
      fpsElement.textContent = fps.toFixed(2);
    }
  });

  // Return chart controls
  return {
    addDataPoint,
  };
}

// Initialize the chart
void initChart();
