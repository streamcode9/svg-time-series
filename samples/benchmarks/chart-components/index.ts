import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { IDataSource } from "svg-time-series";
import { TimeSeriesChart } from "svg-time-series";

import { LegendController } from "../../LegendController.ts";
import { measure, measureOnce, onCsv, animateBench } from "../bench.ts";

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
    seriesAxes: [0, 1],
    getSeries: (i, seriesIdx) => data[i][seriesIdx],
  };
  const legendController = new LegendController(legend);
  const chart = new TimeSeriesChart(svg, source, legendController);
  const renderMs = performance.now() - start;
  const renderTimeEl = document.getElementById("render-time");
  if (renderTimeEl) {
    renderTimeEl.textContent = `render: ${renderMs.toFixed(1)}ms`;
  }

  let j = 0;
  animateBench(() => {
    const point = data[j % data.length];
    chart.updateChartWithNewData(point[0], point[1]);
    j++;
  });

  measure(3, ({ fps }) => {
    const fpsEl = document.getElementById("fps");
    if (fpsEl) {
      fpsEl.textContent = fps.toFixed(2);
    }
  });

  measureOnce(60, ({ fps }) => {
    console.log(
      `${String(window.innerWidth)}x${String(window.innerHeight)} FPS = ${fps.toFixed(2)}`,
    );
  });
});
