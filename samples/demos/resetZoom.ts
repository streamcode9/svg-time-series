import { csv } from "d3-request";
import { pointer, select } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { TimeSeriesChart, IMinMax } from "svg-time-series";

function buildSegmentTreeTupleNy(
  index: number,
  elements: ReadonlyArray<[number, number]>,
): IMinMax {
  const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0];
  const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0];
  return { min: nyMinValue, max: nyMaxValue };
}

function buildSegmentTreeTupleSf(
  index: number,
  elements: ReadonlyArray<[number, number]>,
): IMinMax {
  const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1];
  const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1];
  return { min: sfMinValue, max: sfMaxValue };
}

csv("ny-vs-sf.csv")
  .row((d: { NY: string; SF: string }) => [
    parseFloat(d.NY.split(";")[0]),
    parseFloat(d.SF.split(";")[0]),
  ])
  .get((error: null, data: [number, number][]) => {
    if (error != null) {
      alert("Data can't be downloaded or parsed");
      return;
    }

    let chart: TimeSeriesChart;

    const onZoom = (event: D3ZoomEvent<SVGRectElement, unknown>) =>
      chart.interaction.zoom(event);
    const onMouseMove = function (this: Element, event: MouseEvent) {
      const [x] = pointer(event, this);
      chart.interaction.onHover(x);
    };

    const svg = select<SVGSVGElement, unknown>("svg");
    const legend = select<HTMLElement, unknown>(".chart-legend");
    chart = new TimeSeriesChart(
      svg,
      legend,
      Date.now(),
      86400000,
      data,
      buildSegmentTreeTupleNy,
      buildSegmentTreeTupleSf,
      true,
      onZoom,
      onMouseMove,
    );

    document
      .getElementById("reset")!
      .addEventListener("click", () => chart.interaction.resetZoom());
  });
