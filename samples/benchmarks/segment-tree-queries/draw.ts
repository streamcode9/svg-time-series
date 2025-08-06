import { BaseType, Selection } from "d3-selection";

import {
  IMinMax,
  SegmentTree,
} from "../../../svg-time-series/src/segmentTree.ts";
import { animateBench, animateCosDown } from "../bench.ts";
import { ViewWindowTransform } from "../../ViewWindowTransform.ts";

function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
  const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0];
  const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0];
  const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1];
  const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1];
  return {
    min: Math.min(nyMinValue, sfMinValue),
    max: Math.max(nyMaxValue, sfMaxValue),
  };
}

export class TimeSeriesChart {
  constructor(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    data: number[][],
  ) {
    const node: SVGSVGElement = svg.node() as SVGSVGElement;
    const div: HTMLElement = node.parentNode as HTMLElement;
    const viewNode: SVGGElement = svg.select("g").node() as SVGGElement;

    const dataLength = data.length;
    const tree = new SegmentTree(data, dataLength, buildSegmentTreeTuple);

    const t = new ViewWindowTransform(viewNode.transform.baseVal);
    t.setViewPort(div.clientWidth, div.clientHeight);

    animateBench((elapsed: number) => {
      const minX = animateCosDown(dataLength / 2, 0, elapsed);
      const maxX = minX + dataLength / 2;
      const { min, max } = tree.query(minX, maxX);
      t.setViewWindow(minX, maxX, min, max);
    });
  }
}
