import type { Selection } from "d3-selection";
// createDimensions no longer returns basis objects; only width and height

export function createDimensions(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
): { width: number; height: number } {
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

  return { width, height };
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
