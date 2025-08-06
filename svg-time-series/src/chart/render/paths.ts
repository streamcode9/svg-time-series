import { BaseType, Selection } from "d3-selection";
import { line } from "d3-shape";
import { ViewportTransform } from "../../ViewportTransform.ts";
import type { RenderState } from "../render.ts";

export interface PathSet {
  path: Selection<SVGPathElement, number, any, unknown>;
  viewNy: SVGGElement;
  viewSf?: SVGGElement;
}

export interface TransformPair {
  ny: ViewportTransform;
  sf?: ViewportTransform;
}

export function initPaths(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  hasSf: boolean,
): PathSet {
  const views = svg
    .selectAll("g")
    .data(hasSf ? [0, 1] : [0])
    .enter()
    .append("g")
    .attr("class", "view");
  const nodes = views.nodes() as SVGGElement[];
  const viewNy = nodes[0];
  const viewSf = hasSf ? nodes[1] : undefined;
  const path = views.append("path");
  return { path, viewNy, viewSf };
}

export function createTransforms(paths: PathSet): TransformPair {
  const ny = new ViewportTransform();
  let sf: ViewportTransform | undefined;
  if (paths.viewSf) {
    sf = new ViewportTransform();
  }
  return { ny, sf };
}

export function renderPaths(
  state: RenderState,
  dataArr: Array<[number, number?]>,
) {
  const drawLine = (cityIdx: number) =>
    line<[number, number?]>()
      .defined((d) => !(isNaN(d[cityIdx]!) || d[cityIdx] == null))
      .x((_, i) => i)
      .y((d) => d[cityIdx]!);

  state.paths.path.attr(
    "d",
    (cityIndex: number) => drawLine(cityIndex)(dataArr) ?? "",
  );
}
