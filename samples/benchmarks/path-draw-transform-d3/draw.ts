﻿import { BaseType, Selection } from "d3-selection";

import { animateBench, animateCosDown } from "../bench.ts";
import { ViewWindowTransform } from "../../../svg-time-series/src/ViewWindowTransform.ts";

export class TimeSeriesChart {
  constructor(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    dataLength: number,
  ) {
    const node: SVGSVGElement = svg.node() as SVGSVGElement;
    const div: HTMLElement = node.parentNode as HTMLElement;
    const viewNode: SVGGElement = svg.select("g").node() as SVGGElement;
    const t = new ViewWindowTransform(viewNode.transform.baseVal);
    t.setViewPort(div.clientWidth, div.clientHeight);

    animateBench((elapsed: number) => {
      const minY = -5;
      const maxY = 83;
      const minX = animateCosDown(dataLength / 2, 0, elapsed);
      const maxX = minX + dataLength / 2;
      t.setViewWindow(minX, maxX, minY, maxY);
    });
  }
}