import { BaseType, Selection } from "d3-selection";

import { animateBench } from "../bench.ts";
import { ViewWindowTransform } from "../../ViewWindowTransform.ts";

export function TimeSeriesChart(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  dataLength: number,
  drawLine: (idx: number, off: number) => string,
): void {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;
  const viewNode: SVGGElement = svg.select("g").node() as SVGGElement;
  const t = new ViewWindowTransform(viewNode.transform.baseVal);
  t.setViewPort(div.clientWidth, div.clientHeight);

  const minY = -5;
  const maxY = 83;
  const minX = dataLength / 4;
  const maxX = minX + dataLength / 2;
  t.setViewWindow(minX, maxX, minY, maxY);

  const paths = svg.select("g.view").selectAll("path");

  let off = 0;
  animateBench(() => {
    // Redraw path
    paths.attr("d", (cityIdx: number) => drawLine(cityIdx, off));
    off += 1;
  });
}
