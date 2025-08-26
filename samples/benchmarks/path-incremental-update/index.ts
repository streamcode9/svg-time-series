import { select } from "d3-selection";
import { range } from "d3-array";
import { scaleLinear } from "d3-scale";

const N = 5000;
const chunkSize = 1000;
const svg = select<SVGSVGElement, unknown>("#chart");

const xScale = scaleLinear()
  .domain([0, N - 1])
  .range([0, 800]);

function createData() {
  return range(N).map((i) => [xScale(i), 100 + Math.sin(i / 50) * 80]);
}

function toPath(pts: [number, number][]) {
  return "M" + pts.map((p) => p.join(",")).join("L");
}

// --- single path setup ---
let singleData = createData();
const singlePath = svg
  .append("path")
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("d", toPath(singleData));

function updateSingle() {
  const last = singleData[singleData.length - 1];
  const next: [number, number] = [
    last[0] + (xScale(1) - xScale(0)),
    100 + Math.sin(last[0] / 50) * 80 + (Math.random() - 0.5),
  ];
  singleData.push(next);
  singleData.shift();
  singlePath.attr("d", toPath(singleData));
}

// --- chunked paths setup ---
let chunkData = createData();
const chunks: [number, number][][] = [];
for (let i = 0; i < chunkData.length; i += chunkSize) {
  chunks.push(chunkData.slice(i, i + chunkSize));
}
let splitPaths = svg
  .selectAll<SVGPathElement, [number, number][]>("path.chunk")
  .data(chunks)
  .enter()
  .append("path")
  .attr("class", "chunk")
  .attr("fill", "none")
  .attr("stroke", "tomato")
  .attr("d", toPath);

const lastIdx = chunks.length - 1;

function updateChunks() {
  const last = chunkData[chunkData.length - 1];
  const next: [number, number] = [
    last[0] + (xScale(1) - xScale(0)),
    100 + Math.sin(last[0] / 50) * 80 + (Math.random() - 0.5),
  ];
  chunkData.push(next);
  chunkData.shift();
  chunks[0] = chunkData.slice(0, chunkSize);
  chunks[lastIdx] = chunkData.slice(
    lastIdx * chunkSize,
    lastIdx * chunkSize + chunkSize,
  );
  splitPaths = splitPaths.data(chunks);
  splitPaths.filter((_, i) => i === 0 || i === lastIdx).attr("d", toPath);
}

async function benchmark(fn: () => void, iterations = 1000) {
  // warm up
  fn();
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  return (performance.now() - start) / iterations;
}

(async () => {
  const single = await benchmark(updateSingle);
  // reset data for fair comparison
  singleData = createData();
  singlePath.attr("d", toPath(singleData));
  chunkData = createData();
  for (let i = 0; i < chunks.length; i++) {
    chunks[i] = chunkData.slice(i * chunkSize, i * chunkSize + chunkSize);
  }
  splitPaths = svg
    .selectAll<SVGPathElement, [number, number][]>("path.chunk")
    .data(chunks)
    .attr("d", toPath);
  const chunked = await benchmark(updateChunks);
  console.log(`Average update time — single path: ${single.toFixed(2)} ms`);
  console.log(`Average update time — chunked paths: ${chunked.toFixed(2)} ms`);
})();
