import type { Selection } from "d3-selection";

import * as VWTransform from "../../ViewWindowTransform.ts";

export class TimeSeriesChart {
  private SVGNode: SVGSVGElement;

  private vwTransform: VWTransform.ViewWindowTransform;

  private stepX: number;

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    minX: number,
    stepX: number,
    cities: number[],
    onPath: (
      path: Selection<SVGPathElement, number[], SVGGElement, unknown>,
    ) => void,
    dataLength: number,
  ) {
    this.stepX = stepX;

    this.SVGNode = svg.node();
    this.vwTransform = new VWTransform.ViewWindowTransform(
      this.SVGNode.transform.baseVal,
    );

    const width = svg.node().parentNode.clientWidth,
      height = svg.node().parentNode.clientHeight;
    svg.attr("width", width);
    svg.attr("height", height);

    this.vwTransform.setViewPort(width, height);
    this.vwTransform.setViewWindow(minX, dataLength - 1, 8, 81);

    const view = svg
      .append("g")
      .selectAll(".view")
      .data(cities)
      .enter()
      .append("g")
      .attr("class", "view");

    onPath(view.append("path"));
  }
}
