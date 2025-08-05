import { csv } from "d3-request";

import d3shape from "d3-shape";

import d3selection from "d3-selection";
import * as draw from "./draw.ts";
import * as drawModelCS from "./drawModelCS.ts";

const startDate = new Date();
csv("ny-vs-sf.csv")
  .row((d: any) => [
    parseFloat(d.NY.split(";")[0]),
    parseFloat(d.SF.split(";")[0]),
  ])
  .get((error: any, data: any[]) => {
    if (error != null) {
      alert("Data can't be downloaded or parsed");
      return;
    }

    const onPath = (path: any) => {
      path.attr("d", (cityIdx: number) =>
        d3shape
          .line<number[]>()
          .defined((d: number[]) => !!d[cityIdx])
          .x((d: number[], i: number) => i)
          .y((d: number[]) => d[cityIdx])
          .call(null, data),
      );
    };

    const onPathModel = (path: any) => {
      path.attr("d", (cityIdx: number) =>
        d3shape
          .line()
          .defined((d: number[]) => !!d[cityIdx])
          .x((d: number[], i: number) => calcDate(i, startDate, 86400000))
          .y((d: number[]) => d[cityIdx])
          .call(null, data),
      );
    };

    d3selection.selectAll("svg#default").each(function () {
      new draw.TimeSeriesChart(
        d3selection.select(this),
        0,
        1,
        [0, 1],
        onPath,
        data.length,
      );
    });
    d3selection.selectAll("svg#model").each(function () {
      new drawModelCS.TimeSeriesChartModelCS(
        d3selection.select(this),
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

