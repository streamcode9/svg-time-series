import { Selection } from "d3-selection";
import type { ScaleTime } from "d3-scale";
import { AR1Basis, DirectProductBasis } from "../../math/affine.ts";
import type { ChartData } from "../data.ts";

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
