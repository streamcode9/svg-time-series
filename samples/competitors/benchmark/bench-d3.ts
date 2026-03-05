import { select } from "d3-selection";
import { scaleTime, scaleLinear } from "d3-scale";
import { axisBottom, axisRight } from "d3-axis";
import { line } from "d3-shape";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import type { Selection } from "d3-selection";
import type { ZoomBehavior, D3ZoomEvent } from "d3-zoom";
import type { ScaleTime, ScaleLinear } from "d3-scale";

import type { BenchmarkAdapter } from "./harness.ts";
import { runBenchmarkSuite } from "./harness.ts";
import type { BenchmarkDataset } from "./data.ts";

// ---------------------------------------------------------------------------
// Raw D3 adapter – minimal chart with zoom/pan support
// ---------------------------------------------------------------------------

const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;
const MARGIN = { top: 10, right: 40, bottom: 30, left: 10 };

type SvgSel = Selection<SVGSVGElement, unknown, null, undefined>;
type GSel = Selection<SVGGElement, unknown, null, undefined>;
type PathSel = Selection<SVGPathElement, unknown, null, undefined>;

interface ChartState {
  svg: SvgSel;
  g: GSel;
  xScale: ScaleTime<number, number>;
  yScale: ScaleLinear<number, number>;
  zoomBehavior: ZoomBehavior<SVGSVGElement, unknown>;
  pathNy: PathSel;
  pathSf: PathSel;
  xAxis: GSel;
  yAxis: GSel;
  dataset: BenchmarkDataset;
}

function buildLine(
  xScale: ScaleTime<number, number>,
  yScale: ScaleLinear<number, number>,
  dates: Date[],
  values: number[],
): string {
  const gen = line<number>()
    .x((_d, i) => xScale(dates[i]!))
    .y((d) => yScale(d));
  return gen(values) ?? "";
}

class D3Adapter implements BenchmarkAdapter {
  readonly name = "D3 (raw)";

  private state: ChartState | null = null;

  render(container: HTMLElement, dataset: BenchmarkDataset): void {
    container.innerHTML = "";

    const width = CHART_WIDTH - MARGIN.left - MARGIN.right;
    const height = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    const svgNode = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    );
    svgNode.setAttribute("width", String(CHART_WIDTH));
    svgNode.setAttribute("height", String(CHART_HEIGHT));
    container.appendChild(svgNode);

    const svg: SvgSel = select(svgNode);

    const g: GSel = svg
      .append("g")
      .attr(
        "transform",
        `translate(${String(MARGIN.left)},${String(MARGIN.top)})`,
      );

    // Scales
    const xExtent = [
      dataset.dates[0]!,
      dataset.dates[dataset.dates.length - 1]!,
    ] as [Date, Date];
    const xScale = scaleTime().domain(xExtent).range([0, width]);

    let yMin = Infinity;
    let yMax = -Infinity;
    for (let i = 0; i < dataset.ny.length; i++) {
      const n = dataset.ny[i]!;
      const s = dataset.sf[i]!;
      if (Number.isFinite(n)) {
        if (n < yMin) yMin = n;
        if (n > yMax) yMax = n;
      }
      if (Number.isFinite(s)) {
        if (s < yMin) yMin = s;
        if (s > yMax) yMax = s;
      }
    }
    const yScale = scaleLinear().domain([yMin, yMax]).range([height, 0]);

    // Axes
    const xAxis: GSel = g
      .append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${String(height)})`)
      .call(axisBottom(xScale));

    const yAxis: GSel = g
      .append("g")
      .attr("class", "axis y-axis")
      .attr("transform", `translate(${String(width)},0)`)
      .call(axisRight(yScale));

    // Clip path
    const clipId = "bench-clip-" + String(Math.random()).slice(2, 10);
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("width", width)
      .attr("height", height);

    const chartArea = g.append("g").attr("clip-path", `url(#${clipId})`);

    // Paths
    const pathNy: PathSel = chartArea
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "rgb(136,204,91)")
      .attr("stroke-width", 1)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("d", buildLine(xScale, yScale, dataset.dates, dataset.ny));

    const pathSf: PathSel = chartArea
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "rgb(96,77,196)")
      .attr("stroke-width", 1)
      .attr("vector-effect", "non-scaling-stroke")
      .attr("d", buildLine(xScale, yScale, dataset.dates, dataset.sf));

    // Zoom behaviour – attach directly to SVG node
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 100])
      .translateExtent([
        [0, 0],
        [width, height],
      ])
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        const t = event.transform;
        const newX = t.rescaleX(xScale);
        xAxis.call(axisBottom(newX));
        pathNy.attr("d", buildLine(newX, yScale, dataset.dates, dataset.ny));
        pathSf.attr("d", buildLine(newX, yScale, dataset.dates, dataset.sf));
      });

    svg.call(zoomBehavior);

    this.state = {
      svg,
      g,
      xScale,
      yScale,
      zoomBehavior,
      pathNy,
      pathSf,
      xAxis,
      yAxis,
      dataset,
    };
  }

  zoom(factor: number): void {
    if (!this.state) return;
    const { zoomBehavior, svg } = this.state;
    const t = zoomIdentity
      .translate(CHART_WIDTH / 2, 0)
      .scale(factor)
      .translate(-CHART_WIDTH / 2, 0);
    svg.call(zoomBehavior.transform.bind(zoomBehavior), t);
  }

  pan(fraction: number): void {
    if (!this.state) return;
    const { zoomBehavior, svg } = this.state;
    const shift = CHART_WIDTH * fraction;
    const t = zoomIdentity.translate(-shift, 0);
    svg.call(zoomBehavior.transform.bind(zoomBehavior), t);
  }

  destroy(): void {
    if (this.state) {
      this.state.svg.remove();
      this.state = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

void runBenchmarkSuite(new D3Adapter());
