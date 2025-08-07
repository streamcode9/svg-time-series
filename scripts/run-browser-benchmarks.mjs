import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const benchmark = join(
  __dirname,
  "..",
  "samples",
  "benchmarks",
  "chart-components",
  "index.html",
);
const outFile = join(__dirname, "..", "tachometer-results.json");

const proc = spawn("npx", [
  "tachometer",
  benchmark,
  "--measure=fcp",
  "--json-file",
  outFile,
]);

proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stderr);

proc.on("close", (code) => {
  process.exit(code ?? 1);
});
