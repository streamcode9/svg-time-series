import { scaleLinear, scaleTime } from "d3-scale";
import { BaseType, Selection } from "d3-selection";

import { MyAxis, Orientation } from "../../../svg-time-series/src/axis.ts";
import { animateBench, animateCosDown } from "../bench.ts";

export function TimeSeriesChart(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  dataLength: number,
): void {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;

  const width = div.clientWidth;
  const height = div.clientHeight;

  const x = scaleTime().range([0, width]);
  const y = scaleLinear().range([height, 0]);

  const minModelX = Date.now();

  const idxToTime = (idx: number) => minModelX + idx * 86400 * 1000;
  const xAxis = new MyAxis(Orientation.Bottom, x)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height)
    .setScale(x);

  const yAxis = new MyAxis(Orientation.Right, y)
    .ticks(4)
    .setTickSize(width)
    .setTickPadding(2 - width)
    .setScale(y);

  const gX = svg.append("g").attr("class", "axis").call(xAxis.axis.bind(xAxis));

  const gY = svg.append("g").attr("class", "axis").call(yAxis.axis.bind(yAxis));

  animateBench((elapsed: number) => {
    const minY = -5;
    const maxY = 83;
    const minX = animateCosDown(dataLength / 2, 0, elapsed);
    const maxX = minX + dataLength / 2;

    x.domain([minX, maxX].map(idxToTime));
    y.domain([minY, maxY]);

    xAxis.axisUp(gX);
    yAxis.axisUp(gY);
  });
}
