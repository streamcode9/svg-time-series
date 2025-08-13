import { select, selectAll } from "d3-selection";
import { line } from "d3-shape";

import { measure, measureOnce, onCsv } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

onCsv((data: number[][]) => {
  const filteredData = data.filter((_, i) => i % 10 == 0);
  selectAll("g.view")
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path")
    .attr("d", (cityIdx: number) => {
      const pathData = line<number[]>()
        .defined((d) => !isNaN(d[cityIdx]))
        .x((d, i) => i * 10)
        .y((d) => d[cityIdx])(filteredData) as string;
      return pathData;
    });

  selectAll("svg").each(function () {
    TimeSeriesChart(select(this), data);
  });

  measure(3, ({ fps }) => {
    document.getElementById("fps").textContent = fps.toFixed(2);
  });

  measureOnce(60, ({ fps }) => {
    console.log(
      `${String(window.innerWidth)}x${String(window.innerHeight)} FPS = ${fps.toFixed(2)}`,
    );
  });
});
