import * as common from "../../misc/common.ts";
import Plotly from "plotly.js";

function generateData() {
  const lines = [];
  for (let i = 0; i < 10; i++) {
    const xs = [],
      ys = [];
    for (let x = 0; x < 5000; x++) {
      xs.push(x * 0.2);
      ys.push(common.f(x) * 100 + 50 * i);
    }
    lines.push({ y: ys, x: xs, line: { width: 1 }, showlegend: false });
  }
  return lines;
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
