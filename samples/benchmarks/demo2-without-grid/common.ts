import * as draw from "./draw.ts";
import type { IMinMax } from "../../../svg-time-series/src/chart/data.ts";
import type { D3ZoomEvent } from "d3-zoom";
import { select, selectAll } from "d3-selection";

function buildSegmentTreeTuple(
  index: number,
  elements: { values: number[] }[],
): IMinMax {
  const nyMinValue = isNaN(elements[0].values[index])
    ? Infinity
    : elements[0].values[index];
  const nyMaxValue = isNaN(elements[0].values[index])
    ? -Infinity
    : elements[0].values[index];
  const sfMinValue = isNaN(elements[1].values[index])
    ? Infinity
    : elements[1].values[index];
  const sfMaxValue = isNaN(elements[1].values[index])
    ? -Infinity
    : elements[1].values[index];
  return {
    min: Math.min(nyMinValue, sfMinValue),
    max: Math.max(nyMaxValue, sfMaxValue),
  };
}

export function drawCharts(data: { NY: number; SF: number }[]) {
  const charts: draw.TimeSeriesChart[] = [];
  let newZoom: string | null = null;
  const minX = new Date();
  let j = 0;

  function onZoom(event: D3ZoomEvent<SVGSVGElement, unknown>) {
    const z = event.transform.toString();
    if (z == newZoom) return;

    newZoom = z;
    charts.forEach((c) => c.zoom(event.transform));
  }

  selectAll("svg").each(function () {
    const chart = new draw.TimeSeriesChart(
      select(this),
      minX,
      86400000,
      data,
      buildSegmentTreeTuple,
      onZoom,
    );
    charts.push(chart);
  });

  setInterval(() => {
    const newData = data[j % data.length];
    charts.forEach((c) =>
      c.updateChartWithNewData([
        newData == undefined ? undefined : newData.NY,
        newData == undefined ? undefined : newData.SF,
      ]),
    );
    j++;
  }, 1000);
}
