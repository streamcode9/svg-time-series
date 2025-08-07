import { select, selectAll } from "d3-selection";
import { line } from "d3-shape";
import { measure, measureOnce, onCsv } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

onCsv((data) => {
  const dataLength = data.length;

  const drawLine = (cityIdx: number, off: number) => {
    const idx = (i: number) => (i + off) % dataLength;

    return line()
      .defined((d, i, arr) => !isNaN(arr[idx(i)][cityIdx]))
      .x((d, i) => i)
      .y((d, i, arr) => arr[idx(i)][cityIdx])
      .call(null, data);
  };

  const path = selectAll("g.view")
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path");

  selectAll("svg").each(function () {
    return new TimeSeriesChart(select(this), dataLength, drawLine);
  });

  measure(3, ({ fps }) => {
    document.getElementById("fps").textContent = fps.toFixed(2);
  });

  measureOnce(60, ({ fps }) => {
    console.log(
      `${window.innerWidth}x${window.innerHeight} FPS = ${fps.toFixed(2)}`,
    );
  });
});
