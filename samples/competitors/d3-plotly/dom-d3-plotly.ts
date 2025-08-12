import * as common from "../../misc/common.ts";
import Plotly from "plotly.js";

function generateData() {
  return Array.from({ length: 10 }, (_, i) => {
    const xs = Array.from({ length: 5000 }, (_, x) => x * 0.2);
    const ys = xs.map((_, x) => common.f(x) * 100 + 50 * i);
    return { y: ys, x: xs, line: { width: 1 }, showlegend: false };
  });
}

const container = document.getElementById("plotly-container");

const start = Date.now();
const layout = {
  autosize: false,
  width: 1270,
  height: 750,
  yaxis: { showgrid: false, showticklabels: false },
  xaxis: { showgrid: false, showticklabels: false },
};
async function render() {
  Plotly.newPlot(container, generateData(), layout, { staticPlot: true }).then(
    () => window.requestAnimationFrame(() => console.log(Date.now() - start)),
  );
}
window.requestAnimationFrame(render);
