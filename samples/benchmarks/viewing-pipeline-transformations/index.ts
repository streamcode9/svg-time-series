import { csv } from "d3-request";

import { line } from "d3-shape";
import { select, selectAll, type Selection } from "d3-selection";
import * as draw from "./draw.ts";
import * as drawModelCS from "./drawModelCS.ts";

const startDate = new Date();
csv("../../demos/ny-vs-sf.csv")
  .row((d: { NY: string; SF: string }) => [
    parseFloat(d.NY.split(";")[0]),
    parseFloat(d.SF.split(";")[0]),
  ])
  .get((error: Error | null, data: number[][]) => {
    if (error != null) {
      console.error("Data can't be downloaded or parsed");
      return;
    }

    const onPath = (
      path: Selection<SVGPathElement, number[], SVGGElement, unknown>,
    ) => {
      path.attr("d", (cityIdx: number) =>
        line<number[]>()
          .defined((d: number[]) => !!d[cityIdx])
          .x((d: number[], i: number) => i)
          .y((d: number[]) => d[cityIdx])
          .call(null, data),
      );
    };

    const onPathModel = (
      path: Selection<SVGPathElement, number[], SVGGElement, unknown>,
    ) => {
      path.attr("d", (cityIdx: number) =>
        line()
          .defined((d: number[]) => !!d[cityIdx])
          .x((d: number[], i: number) => calcDate(i, startDate, 86400000))
          .y((d: number[]) => d[cityIdx])
          .call(null, data),
      );
    };

    selectAll("svg#default").each(function () {
      new draw.TimeSeriesChart(select(this), 0, 1, [0, 1], onPath, data.length);
    });
    selectAll("svg#model").each(function () {
      new drawModelCS.TimeSeriesChartModelCS(
        select(this),
        startDate,
        86400000,
        [0, 1],
        onPathModel,
        data.length,
      );
    });
  });

function calcDate(index: number, offset: Date, step: number) {
  const d = new Date(index * step + offset.getTime()).getTime();
  return d;
}
