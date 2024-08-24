import { BaseType, selectAll, Selection } from "d3-selection";

import { animateBench, animateCosDown } from "../bench";
import { ViewWindowTransform } from "../../ViewWindowTransform";

export class TimeSeriesChart {
  constructor(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    dataLength: number,
    drawLine: (element: any, idx: number, chartIdx: number) => void,
    chartIdx: number,
  ) {
    const node: SVGSVGElement = svg.node() as SVGSVGElement;
    const div: HTMLElement = node.parentNode as HTMLElement;
    const viewNode: SVGGElement = svg.select("g").node() as SVGGElement;
    const t = new ViewWindowTransform(viewNode.transform.baseVal);
    t.setViewPort(div.clientWidth, div.clientHeight);

    const minY = -5;
    const maxY = 83;
    const minX = animateCosDown(dataLength / 2, 0, 0);
    const maxX = minX + dataLength / 2;
    t.setViewWindow(minX, maxX, minY, maxY);

    const paths: Selection<any, any, any, any> = svg
      .select("g.view")
      .selectAll("path");

    animateBench((elapsed: number) => {
      // Redraw paths
      paths.each(function (cityIdx: number) {
        drawLine(this, cityIdx, chartIdx);
      });
    });
  }
}
