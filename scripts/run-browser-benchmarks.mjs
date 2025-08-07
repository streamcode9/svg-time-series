import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const benchmarksDir = join(__dirname, "..", "samples", "benchmarks");
const outFile = join(__dirname, "..", "tachometer-results.json");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: "inherit" });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function runTachometer(benchmark, measure) {
  const tmp = await mkdtemp(join(tmpdir(), "tachometer-"));
  const jsonPath = join(tmp, "out.json");
  const args = ["tachometer", benchmark, "--json-file", jsonPath];
  if (measure) {
    args.splice(2, 0, `--measure=${measure}`);
  }
  await run("npx", args);
  const data = JSON.parse(await readFile(jsonPath, "utf8"));
  return data.benchmarks[0];
}

async function main() {
  const benchmarks = process.argv.slice(2);
  if (benchmarks.length === 0) {
    console.error(
      "Usage: node scripts/run-browser-benchmarks.mjs <benchmark...>",
    );
    process.exit(1);
  }

  const results = {};
  for (const rel of benchmarks) {
    const abs = join(benchmarksDir, rel);
    const runtime = await runTachometer(abs, "callback");
    const fcp = await runTachometer(abs, "fcp");
    results[rel] = { runtime, fcp };
  }

  await writeFile(outFile, JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
