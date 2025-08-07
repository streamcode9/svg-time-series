import { TimeSeriesChart, IDataSource } from "svg-time-series";
import { measureAll, onCsv, animateBench } from "../bench.ts";
import { select, Selection } from "d3-selection";

onCsv((data: [number, number][]) => {
  const svg = select(".chart-drawing svg") as Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    unknown
  >;
  const legend = select(".chart-legend") as Selection<
    HTMLElement,
    unknown,
    HTMLElement,
    unknown
  >;

  const start = performance.now();
  const source: IDataSource = {
    startTime: Date.now(),
    timeStep: 86400000,
    length: data.length,
    getNy: (i) => data[i][0],
    getSf: (i) => data[i][1],
  };
  const chart = new TimeSeriesChart(svg, legend, source);
  const renderMs = performance.now() - start;
  document.getElementById("render-time")!.textContent =
    `render: ${renderMs.toFixed(1)}ms`;

  let j = 0;
  animateBench(() => {
    const point = data[j % data.length];
    chart.updateChartWithNewData(point[0], point[1]);
    j++;
  });

  measureAll();
});
