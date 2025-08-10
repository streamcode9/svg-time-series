import type { Selection } from "d3-selection";
import type { ScaleTime } from "d3-scale";
import { AR1Basis, DirectProductBasis } from "../../math/affine.ts";
import type { ChartData } from "../data.ts";

export function createDimensions(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
): DirectProductBasis {
  const node = svg.node();
  if (!node) {
    throw new Error("SVG selection contains no node");
  }

  const parent = node.parentNode;
  if (!(parent instanceof HTMLElement)) {
    throw new Error("SVG element must be attached to an HTMLElement parent");
  }

  const div = parent;

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

export function createSeriesNodes(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
): { view: SVGGElement; path: SVGPathElement } {
  const view = svg.append("g").attr("class", "view");
  const path = view.append<SVGPathElement>("path");
  return {
    view: view.node() as SVGGElement,
    path: path.node() as SVGPathElement,
  };
}
