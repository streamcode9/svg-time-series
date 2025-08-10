import type { BaseType, Selection } from "d3-selection";

import { animateBench } from "../bench.ts";
import { ViewWindowTransform } from "../../ViewWindowTransform.ts";

export function TimeSeriesChart(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  dataLength: number,
  drawLine: (
    element: SVGPathElement,
    cityIdx: number,
    chartIdx: number,
  ) => void,
  chartIdx: number,
): void {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;
  const viewNode: SVGGElement = svg.select("g").node() as SVGGElement;
  const t = new ViewWindowTransform(viewNode.transform.baseVal);
  t.setViewPort(div.clientWidth, div.clientHeight);

  const minY = -5;
  const maxY = 83;
  let minX = 0;
  let maxX = dataLength;
  t.setViewWindow(minX, maxX, minY, maxY);

  const paths: Selection<SVGPathElement, number, SVGGElement, unknown> = svg
    .select("g.view")
    .selectAll<SVGPathElement, number>("path");

  animateBench(() => {
    // Redraw paths
    paths.each(function (cityIdx: number) {
      drawLine(this, cityIdx, chartIdx);
    });
    t.setViewWindow(minX++, maxX++, minY, maxY);
  });
}
