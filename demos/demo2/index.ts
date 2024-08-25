import { select, selectAll } from "d3-selection";
import { measure } from "../../measure";
import { csv } from "d3-request";
import { drawCharts } from "../common";

interface Resize {
  interval: number;
  request: () => void;
  timer: number;
  eval: () => void;
}

const resize: Resize = { interval: 60, request: null, timer: null, eval: null };

function onCsv(f: (csv: [number, number][]) => void): void {
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
      f(data);
    });
}

onCsv((data: [number, number][]) => {
  drawCharts(data);

  resize.request = function () {
    resize.timer && clearTimeout(resize.timer);
    resize.timer = setTimeout(resize.eval, resize.interval);
  };
  resize.eval = function () {
    selectAll("svg").remove();
    selectAll(".chart-drawing").append("svg").append("g").attr("class", "view");
    drawCharts(data);
  };
  window.addEventListener("resize", resize.request, false);
});
