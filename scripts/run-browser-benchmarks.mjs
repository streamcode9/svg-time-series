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

function runCapture(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let data = "";
    proc.stdout.on("data", (chunk) => {
      data += chunk;
    });
    proc.on("close", (code) => {
      if (code === 0) {
        resolve(data.trim());
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

async function runTachometer(benchmark, measure, sampleSize) {
  const tmp = await mkdtemp(join(tmpdir(), "tachometer-"));
  const jsonPath = join(tmp, "out.json");
  const args = ["tachometer", benchmark, "--json-file", jsonPath];
  if (measure) {
    args.splice(2, 0, `--measure=${measure}`);
  }
  if (sampleSize !== undefined) {
    args.push("--sample-size", String(sampleSize));
  }
  await run("npx", args);
  const data = JSON.parse(await readFile(jsonPath, "utf8"));
  return data.benchmarks[0];
}

async function main() {
  const argv = process.argv.slice(2);
  let sampleSize;
  const benchmarks = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--sample-size") {
      sampleSize = Number(argv[++i]);
    } else if (arg.startsWith("--sample-size=")) {
      sampleSize = Number(arg.split("=")[1]);
    } else {
      benchmarks.push(arg);
    }
  }
  if (benchmarks.length === 0) {
    console.error(
      "Usage: node scripts/run-browser-benchmarks.mjs [--sample-size=N] <benchmark...>",
    );
    process.exit(1);
  }

  const metadata = {
    commit: await runCapture("git", ["rev-parse", "HEAD"]),
    node: process.version,
    timestamp: new Date().toISOString(),
    browsers: {},
  };
  const results = { metadata };
  for (const rel of benchmarks) {
    const abs = join(benchmarksDir, rel);
    const runtime = await runTachometer(abs, "callback", sampleSize);
    const fcp = await runTachometer(abs, "fcp", sampleSize);
    results[rel] = { runtime, fcp };
    const browser = runtime.browser;
    if (browser?.name && browser?.version) {
      metadata.browsers[browser.name] = browser.version;
    }
  }

  await writeFile(outFile, JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
