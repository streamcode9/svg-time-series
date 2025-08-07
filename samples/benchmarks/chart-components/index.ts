import { TimeSeriesChart, IMinMax } from "svg-time-series";
import { measureAll, onCsv, animateBench } from "../bench.ts";
import { select, Selection } from "d3-selection";

function buildSegmentTupleNy(
  index: number,
  elements: ReadonlyArray<[number, number]>,
): IMinMax {
  const ny = elements[index][0];
  return { min: ny, max: ny };
}

function buildSegmentTupleSf(
  index: number,
  elements: ReadonlyArray<[number, number]>,
): IMinMax {
  const sf = elements[index][1];
  return { min: sf, max: sf };
}

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
  const chart = new TimeSeriesChart(
    svg,
    legend,
    Date.now(),
    86400000,
    data,
    buildSegmentTupleNy,
    buildSegmentTupleSf,
  );
  const renderMs = performance.now() - start;
  document.getElementById("render-time")!.textContent =
    `render: ${renderMs.toFixed(1)}ms`;

  let j = 0;
  animateBench(() => {
    const point = data[j % data.length];
    chart.updateChartWithNewData(point);
    j++;
  });

  measureAll();
});
