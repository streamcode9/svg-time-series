import { Selection } from "d3-selection";
import { line, type Line } from "d3-shape";
import type { ScaleTime } from "d3-scale";
import { AR1Basis, DirectProductBasis } from "../../math/affine.ts";
import type { ChartData } from "../data.ts";
import type { RenderState } from "../render.ts";

export function createLine(seriesIdx: number): Line<number[]> {
  return line<number[]>()
    .defined((d) => !(isNaN(d[seriesIdx]) || d[seriesIdx] == null))
    .x((_, i) => i)
    .y((d) => d[seriesIdx] as number);
}

export function createDimensions(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
): DirectProductBasis {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;

  const width = div.clientWidth;
  const height = div.clientHeight;

  svg.attr("width", width);
  svg.attr("height", height);

  const bScreenXVisible = new AR1Basis(0, width);
  const bScreenYVisible = new AR1Basis(height, 0);

  return DirectProductBasis.fromProjections(bScreenXVisible, bScreenYVisible);
}

export function updateScaleX(
  x: ScaleTime<number, number>,
  bIndexVisible: AR1Basis,
  data: ChartData,
) {
  const transform = data.indexToTime();
  const bTimeVisible = bIndexVisible.transformWith(transform);
  x.domain(bTimeVisible.toArr());
}

export interface SeriesNode {
  view: SVGGElement;
  path: SVGPathElement;
}

export function initSeriesNode(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
): SeriesNode {
  const view = svg.append("g").attr("class", "view");
  const path = view.append<SVGPathElement>("path").node() as SVGPathElement;
  return { view: view.node() as SVGGElement, path };
}

export function renderPaths(state: RenderState, dataArr: number[][]) {
  const series = state.series;
  for (const s of series) {
    if (s.path) {
      s.path.setAttribute("d", s.line(dataArr) ?? "");
    }
  }
}
