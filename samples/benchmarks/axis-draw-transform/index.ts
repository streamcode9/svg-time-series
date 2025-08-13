import { select, selectAll } from "d3-selection";

import { measure, measureOnce } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

function makeChart(this: SVGSVGElement): void {
  TimeSeriesChart(select<SVGSVGElement, unknown>(this), 1070);
}

selectAll<SVGSVGElement, unknown>("svg").each(makeChart);

measure(3, ({ fps }) => {
  document.getElementById("fps").textContent = fps.toFixed(2);
});

measureOnce(60, ({ fps }) => {
  console.log(
    `${String(window.innerWidth)}x${String(window.innerHeight)} FPS = ${fps.toFixed(2)}`,
  );
});
