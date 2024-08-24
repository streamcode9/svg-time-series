import { select, selectAll } from "d3-selection";
import { line } from "d3-shape";

import { measureAll, onCsv } from "../bench";
import { TimeSeriesChart } from "./draw";

onCsv((data) => {
  const path = selectAll("g.view")
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path")
    .attr("d", (cityIdx) =>
      line()
        .defined((d) => !isNaN(d[cityIdx]))
        .x((d, i) => i)
        .y((d) => d[cityIdx])
        .call(null, data),
    );

  selectAll("svg").each(function () {
    return new TimeSeriesChart(select(this), data.length);
  });
  measureAll();
});
