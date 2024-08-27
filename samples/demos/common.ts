import { ValueFn, select, selectAll, pointer } from "d3-selection";

import { TimeSeriesChart, IMinMax } from "svg-time-series";
import { measure } from "../measure.ts";

function buildSegmentTreeTupleNy(index: number, elements: number[][]): IMinMax {
  const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0];
  const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0];
  return { min: nyMinValue, max: nyMaxValue };
}

function buildSegmentTreeTupleSf(index: number, elements: number[][]): IMinMax {
  const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1];
  const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1];
  return { min: sfMinValue, max: sfMaxValue };
}

export function drawCharts(data: [number, number][]) {
  const charts: TimeSeriesChart[] = [];

  const onZoom = (event: any) => charts.forEach((c) => c.zoom(event));
  const onMouseMove = (event: any) => {
    const [x, _] = pointer(event, event.target);
    charts.forEach((c) => c.onHover(x));
  };

  const onSelectChart: ValueFn<HTMLElement, any, any> = function (
    element: HTMLElement,
    datum: any,
    descElement: any,
  ) {
    const svg = select(this).select("svg");
    const legend = select(this).select(".chart-legend");
    const chart = new TimeSeriesChart(
      svg,
      legend,
      Date.now(),
      86400000,
      data.map((_) => _),
      buildSegmentTreeTupleNy,
      buildSegmentTreeTupleSf,
      onZoom,
      onMouseMove,
    );
    charts.push(chart);
  };

  selectAll(".chart").select<HTMLElement>(onSelectChart);

  let j = 0;
  setInterval(function () {
    const newData = data[j % data.length];
    charts.forEach((c) => c.updateChartWithNewData(newData));
    j++;
  }, 5000);
  measure(3, (fps) => {
    document.getElementById("fps").textContent = fps;
  });
}
