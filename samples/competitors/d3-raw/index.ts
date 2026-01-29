import { select } from "d3-selection";
import { scaleTime, scaleLinear } from "d3-scale";
import { axisBottom, axisLeft } from "d3-axis";
import { line, curveLinear } from "d3-shape";
import { zoom, zoomIdentity } from "d3-zoom";
import type { D3ZoomEvent } from "d3-zoom";
import { brushX } from "d3-brush";
import type { D3BrushEvent } from "d3-brush";
import { timeFormat } from "d3-time-format";
import { SegmentTree } from "segment-tree-rmq";

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

// Generate random walk data
function generateRandomWalk(
  numPoints: number,
  startValue = 0,
  volatility = 1,
): number[] {
  const values = [startValue];
  for (let i = 1; i < numPoints; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    values.push(values[i - 1]! + change);
  }
  return values;
}

// Chart configuration
const margin = { top: 40, right: 30, bottom: 60, left: 60 };
const containerWidth = 800;
const containerHeight = 550;
const width = containerWidth - margin.left - margin.right;
const height = containerHeight - margin.top - margin.bottom;

// Time configuration
const originTime = new Date("2024-01-01T00:00:00");
const slotInterval = 60000; // 1 minute in milliseconds
const numDataPoints = 500;

// Generate multiple series
const numSeries = 3;
interface Series {
  id: number;
  values: number[];
  color: string;
}
const series: Series[] = [];
const colors = ["#2E86AB", "#A23B72", "#F18F01"];

for (let i = 0; i < numSeries; i++) {
  const values = generateRandomWalk(numDataPoints, Math.random() * 20 - 10, 2);
  series.push({
    id: i,
    values: values,
    color: colors[i % colors.length]!,
  });
}

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
const jointSegmentTree = new SegmentTree(
  jointMinMaxData,
  buildMinMax,
  minMaxIdentity,
);

// Get global extent from the tree root
const yExtent = (() => {
  const result = jointSegmentTree.query(0, numDataPoints - 1);
  return [result.min, result.max] as [number, number];
})();

// Add some padding to y extent
const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
const yDomain: [number, number] = [
  yExtent[0] - yPadding,
  yExtent[1] + yPadding,
];

// Function to calculate visible range extent using segment tree
function getVisibleYExtent(xDomainRange: [Date, Date]): [number, number] {
  const startTime = xDomainRange[0].getTime();
  const endTime = xDomainRange[1].getTime();

  // Convert time range to data indices
  const startIndex = Math.max(
    0,
    Math.floor((startTime - originTime.getTime()) / slotInterval),
  );
  const endIndex = Math.min(
    numDataPoints - 1,
    Math.ceil((endTime - originTime.getTime()) / slotInterval),
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
  .attr("transform", `translate(${String(margin.left)},${String(margin.top)})`);

// Create scales
const xScale = scaleTime()
  .domain([
    originTime,
    new Date(originTime.getTime() + (numDataPoints - 1) * slotInterval),
  ])
  .range([0, width]);

const yScale = scaleLinear().domain(yDomain).range([height, 0]);

// Store original domains for reset functionality
const originalXDomain = xScale.domain() as [Date, Date];
const originalYDomain = yScale.domain() as [number, number];

// Current visible range (for calculating normalized coordinates)
let currentXDomain: [Date, Date] = [...originalXDomain];
let currentYDomain: [number, number] = [...originalYDomain];

// Create axes
const formatTime = timeFormat("%H:%M");
const xAxis = axisBottom(xScale).tickFormat((d) => formatTime(d as Date));

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
  updateGrid();
}

// Initial render of axes and grid
updateAxes();

// Add axis labels
g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("x", width / 2)
  .attr("y", height + 50)
  .text("Time");

g.append("text")
  .attr("class", "axis-label")
  .attr("text-anchor", "middle")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", -40)
  .text("Value");

// Add chart title
svg
  .append("text")
  .attr("class", "chart-title")
  .attr("x", containerWidth / 2)
  .attr("y", 25)
  .text("Random Walk Time Series");

// Create line generator without x/y accessors
const lineFn = line().curve(curveLinear);

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
function getNormalizedCoordinates(seriesValues: number[]): [number, number][] {
  return seriesValues.map((value, index) => {
    const timeValue = originTime.getTime() + index * slotInterval;
    const normalizedX =
      (timeValue - currentXDomain[0].getTime()) /
      (currentXDomain[1].getTime() - currentXDomain[0].getTime());
    const normalizedY =
      (value - currentYDomain[0]) / (currentYDomain[1] - currentYDomain[0]);
    return [normalizedX, normalizedY];
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
    .attr("stroke-width", 2)
    .attr("vector-effect", "non-scaling-stroke");

  // Update all line groups
  linesContainer
    .selectAll<SVGGElement, Series>(".line-group")
    .each(function (d) {
      const pathData = getNormalizedCoordinates(d.values);

      select(this)
        .select<SVGPathElement>("path")
        .datum(pathData)
        .attr("d", lineFn)
        .attr("stroke", d.color);
    });
}

// Initial render of lines
updateLines();

// Add legend
const legend = g
  .append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${String(width - 100)}, 20)`);

series.forEach((s, i) => {
  const legendItem = legend
    .append("g")
    .attr("transform", `translate(0, ${String(i * 20)})`);

  legendItem
    .append("line")
    .attr("x1", 0)
    .attr("x2", 15)
    .attr("y1", 0)
    .attr("y2", 0)
    .attr("stroke", s.color)
    .attr("stroke-width", 2);

  legendItem
    .append("text")
    .attr("x", 20)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .attr("font-size", "12px")
    .text(`Series ${String(s.id + 1)}`);
});

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
      constrainedXDomain[1] = new Date(constrainedXDomain[1].getTime() + shift);
    }

    if (constrainedXDomain[1] > dataEndTime) {
      const shift = constrainedXDomain[1].getTime() - dataEndTime.getTime();
      constrainedXDomain[1] = dataEndTime;
      constrainedXDomain[0] = new Date(constrainedXDomain[0].getTime() - shift);
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

    // Update selection info
    const startTime = timeFormat("%H:%M:%S")(constrainedTimeRange[0]);
    const endTime = timeFormat("%H:%M:%S")(constrainedTimeRange[1]);
    document.getElementById("selectionInfo")!.textContent =
      `Selection: ${startTime} - ${endTime}`;

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
  .call(zoomBehavior);

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

  // Clear selection info
  document.getElementById("selectionInfo")!.textContent = "";
}

function toggleBrush(): void {
  brushEnabled = !brushEnabled;
  const button = document.getElementById("brushToggle")!;

  if (brushEnabled) {
    brushGroup.style("display", null);
    zoomOverlay.style("pointer-events", "none").style("cursor", "default");
    button.textContent = "Disable Brush";
  } else {
    brushGroup.style("display", "none");
    zoomOverlay.style("pointer-events", "all").style("cursor", "grab");
    button.textContent = "Enable Brush";
    document.getElementById("selectionInfo")!.textContent = "";
  }
}

// Export functions for button handlers
(window as unknown as { resetZoom: () => void }).resetZoom = resetZoom;
(window as unknown as { toggleBrush: () => void }).toggleBrush = toggleBrush;

console.log("Chart generated with:");
console.log(`- ${String(numDataPoints)} data points per series`);
console.log(`- ${String(numSeries)} series`);
console.log(
  `- Y extent calculated using segment tree: [${yExtent[0].toFixed(2)}, ${yExtent[1].toFixed(2)}]`,
);
console.log(
  `- Time slots: ${String(slotInterval)}ms intervals starting from ${originTime.toISOString()}`,
);
