import { select, selectAll } from "d3-selection";

import { measure, measureOnce } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

function makeChart() {
  return new TimeSeriesChart(select(this), 1070);
}

selectAll("svg").each(makeChart);

measure(3, ({ fps }) => {
  document.getElementById("fps").textContent = fps.toFixed(2);
});

measureOnce(60, ({ fps }) => {
  alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps.toFixed(2)}`);
});
