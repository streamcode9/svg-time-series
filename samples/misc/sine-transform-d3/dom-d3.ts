import { selectAll } from "d3-selection";
import { line as d3_line } from "d3-shape";

import { f, run } from "../common.ts";

const delta = 0;
const scale = 0.2;
const data = Array.from({ length: 5000 }, (_, x) => f(x));
const line = d3_line<number>()
  .x((y, i) => i)
  .y((y) => y);

const paths = selectAll("path").datum(data).attr("d", line);

run(100, delta, scale, (delt, scal) => {
  paths.attr("transform", (d, i) => {
    const tx = -delt;
    const ty = i * 50;
    return `translate(${tx.toString()}, ${ty.toString()}) scale(${scal.toString()}, 100)`;
  });
});
