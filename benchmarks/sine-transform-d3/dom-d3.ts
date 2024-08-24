﻿import { selectAll } from "d3-selection";
import { line as d3_line } from "d3-shape";

import { f, run } from "../common";

const delta = 0;
const scale = 0.2;
const data = [];
for (let x = 0; x < 5000; x++) {
  data.push(f(x));
}
const line = d3_line<number>()
  .x((y, i) => i)
  .y((y) => y);

const paths = selectAll("path").datum(data).attr("d", line);

run(100, delta, scale, (delt, scal) => {
  paths.attr("transform", (d, i) => {
    const tx = -delt;
    const ty = i * 50;
    return `translate(${tx}, ${ty}) scale(${scal}, 100)`;
  });
});
