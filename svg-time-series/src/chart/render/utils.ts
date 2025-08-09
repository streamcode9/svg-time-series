import { Selection } from "d3-selection";
import { line } from "d3-shape";
import { ScaleLinear, ScaleTime, scaleLinear, scaleTime } from "d3-scale";
import {
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
} from "../../math/affine.ts";
import type { ViewportTransform } from "../../ViewportTransform.ts";
import type { ChartData } from "../data.ts";
import type { RenderState } from "../render.ts";

export const lineNy = line<number[]>()
  .defined((d) => !(isNaN(d[0]) || d[0] == null))
  .x((_, i) => i)
  .y((d) => d[0] as number);

export const lineSf = line<number[]>()
  .defined((d) => !(isNaN(d[1]) || d[1] == null))
  .x((_, i) => i)
  .y((d) => d[1] as number);

export function createDimensions(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
) {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;

  const width = div.clientWidth;
  const height = div.clientHeight;

  svg.attr("width", width);
  svg.attr("height", height);

  const bScreenXVisible = new AR1Basis(0, width);
  const bScreenYVisible = new AR1Basis(height, 0);

  return { width, height, bScreenXVisible, bScreenYVisible };
}

export interface ScaleSet {
  x: ScaleTime<number, number>;
  y: ScaleLinear<number, number>[];
}

export function createScales(
  bScreenVisible: DirectProductBasis,
  yScaleCount: number,
): ScaleSet {
  const [xRange, yRange] = bScreenVisible.toArr();
  const x: ScaleTime<number, number> = scaleTime().range(xRange);
  const y = Array.from({ length: yScaleCount }, () =>
    scaleLinear<number, number>().range(yRange),
  );
  return { x, y };
}

export function updateScaleX(
  x: ScaleTime<number, number>,
  bIndexVisible: AR1Basis,
  data: ChartData,
) {
  const bIndex = new AR1Basis(data.startIndex, data.startIndex + 1);
  const bTime = new AR1Basis(data.startTime, data.startTime + data.timeStep);
  const indexToTime = betweenTBasesAR1(bIndex, bTime);
  const bTimeVisible = bIndexVisible.transformWith(indexToTime);
  x.domain(bTimeVisible.toArr());
}

export interface PathSet {
  path: Selection<SVGPathElement, number, SVGGElement, unknown>;
  nodes: SVGGElement[];
}

export function initPaths(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  seriesCount: number,
): PathSet {
  const views = svg
    .selectAll<SVGGElement, number>("g")
    .data(Array.from({ length: seriesCount }, (_, i) => i))
    .enter()
    .append("g")
    .attr("class", "view");
  const nodes = views.nodes() as SVGGElement[];
  const path = views.append<SVGPathElement>("path");
  return { path, nodes };
}

export function renderPaths(state: RenderState, dataArr: number[][]) {
  const series = state.series;
  for (const s of series) {
    if (s.path) {
      s.path.setAttribute("d", s.line(dataArr) ?? "");
    }
  }
}
