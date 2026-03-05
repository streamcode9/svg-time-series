import type { BenchmarkDataset } from "./data.ts";
import { loadCsvData, scaleDataset, DATA_SIZES } from "./data.ts";

// ---------------------------------------------------------------------------
// Adapter interface – each library implements this
// ---------------------------------------------------------------------------

/**
 * Library-specific adapter that the harness drives during each benchmark run.
 *
 * All methods operate on the same `container` element passed to `render`.
 */
export interface BenchmarkAdapter {
  /** Human-readable library name shown in the results table. */
  readonly name: string;

  /**
   * Render the chart into `container` with the given dataset.
   * Called once per (library, dataSize) combination.
   */
  render(container: HTMLElement, dataset: BenchmarkDataset): void;

  /**
   * Programmatically zoom the chart.
   * `factor` > 1 means zoom-in (show fewer points); < 1 means zoom-out.
   */
  zoom(factor: number): void;

  /**
   * Programmatically pan the chart by a relative fraction of the visible
   * window.  Positive = pan right (forward in time).
   */
  pan(fraction: number): void;

  /** Tear down the chart and free resources. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Measurement helpers
// ---------------------------------------------------------------------------

/**
 * Run `fn`, then wait for the browser to
 * paint (double-rAF) and return the total time in ms.
 */
function measureWithPaint(fn: () => void): Promise<number> {
  return new Promise((resolve) => {
    const start = performance.now();
    fn();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(performance.now() - start);
      });
    });
  });
}

/** Return the median of a sorted-ascending numeric array. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface BenchmarkMetrics {
  initialRenderMs: number;
  zoomRenderMs: number;
  panRenderMs: number;
}

export interface BenchmarkRun {
  library: string;
  dataSize: number;
  metrics: BenchmarkMetrics;
}

// ---------------------------------------------------------------------------
// Core runner
// ---------------------------------------------------------------------------

const WARMUP_ITERATIONS = 1;
const MEASURE_ITERATIONS = 5;

/**
 * Run the full benchmark for one (adapter, dataset) combination.
 *
 * 1. Warm-up renders (discarded).
 * 2. Measure initial render × `MEASURE_ITERATIONS`.
 * 3. Measure zoom × `MEASURE_ITERATIONS`.
 * 4. Measure pan  × `MEASURE_ITERATIONS`.
 *
 * Returns the **median** of each category.
 */
async function runSingle(
  adapter: BenchmarkAdapter,
  container: HTMLElement,
  dataset: BenchmarkDataset,
): Promise<BenchmarkMetrics> {
  // -- warm-up ---------------------------------------------------------------
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    adapter.render(container, dataset);
    adapter.zoom(2);
    adapter.pan(0.1);
    adapter.destroy();
    container.innerHTML = "";
  }

  // -- initial render --------------------------------------------------------
  const renderTimes: number[] = [];
  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    const t = await measureWithPaint(() => {
      adapter.render(container, dataset);
    });
    renderTimes.push(t);
    adapter.destroy();
    container.innerHTML = "";
  }

  // Re-render for zoom/pan measurements
  adapter.render(container, dataset);

  // -- zoom ------------------------------------------------------------------
  const zoomTimes: number[] = [];
  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    const factor = 1.5 + i * 0.5; // vary factor slightly across iterations
    const t = await measureWithPaint(() => {
      adapter.zoom(factor);
    });
    zoomTimes.push(t);
  }

  // Reset back to original view for pan tests
  adapter.destroy();
  container.innerHTML = "";
  adapter.render(container, dataset);

  // -- pan -------------------------------------------------------------------
  const panTimes: number[] = [];
  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    const fraction = 0.05 + i * 0.02;
    const t = await measureWithPaint(() => {
      adapter.pan(fraction);
    });
    panTimes.push(t);
  }

  adapter.destroy();
  container.innerHTML = "";

  return {
    initialRenderMs: median(renderTimes),
    zoomRenderMs: median(zoomTimes),
    panRenderMs: median(panTimes),
  };
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function setStatus(el: HTMLElement, message: string): void {
  el.textContent = message;
}

function buildResultsTable(runs: BenchmarkRun[]): HTMLTableElement {
  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width = "100%";
  table.style.marginTop = "16px";
  table.style.fontFamily = "monospace";

  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  for (const header of [
    "Data Size",
    "Initial Render (ms)",
    "Zoom Re-render (ms)",
    "Pan Re-render (ms)",
  ]) {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.border = "1px solid #ccc";
    th.style.padding = "8px";
    th.style.textAlign = "right";
    th.style.background = "#f5f5f5";
    headerRow.appendChild(th);
  }

  const tbody = table.createTBody();
  for (const run of runs) {
    const row = tbody.insertRow();
    for (const value of [
      run.dataSize.toLocaleString(),
      run.metrics.initialRenderMs.toFixed(2),
      run.metrics.zoomRenderMs.toFixed(2),
      run.metrics.panRenderMs.toFixed(2),
    ]) {
      const td = row.insertCell();
      td.textContent = value;
      td.style.border = "1px solid #ccc";
      td.style.padding = "8px";
      td.style.textAlign = "right";
    }
  }

  return table;
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Public entry point – wire up a page for one library adapter
// ---------------------------------------------------------------------------

/**
 * Call this from each per-library page.  It creates the UI, runs the
 * benchmark suite across all `DATA_SIZES`, and displays the results.
 */
export async function runBenchmarkSuite(
  adapter: BenchmarkAdapter,
): Promise<void> {
  // Grab (or create) well-known DOM nodes
  const status =
    document.getElementById("bench-status") ?? document.createElement("div");
  const resultsContainer =
    document.getElementById("bench-results") ?? document.createElement("div");
  const chartContainer =
    document.getElementById("bench-chart") ?? document.createElement("div");

  setStatus(status, `Loading ny-vs-sf.csv…`);
  const rawData = await loadCsvData();

  const allRuns: BenchmarkRun[] = [];

  for (const size of DATA_SIZES) {
    setStatus(status, `Scaling dataset to ${size.toLocaleString()} points…`);
    const dataset = scaleDataset(rawData, size);
    await new Promise((r) => setTimeout(r, 50)); // let UI update

    setStatus(
      status,
      `Running benchmark for ${adapter.name} @ ${size.toLocaleString()} points…`,
    );
    const metrics = await runSingle(adapter, chartContainer, dataset);
    allRuns.push({ library: adapter.name, dataSize: size, metrics });
    setStatus(
      status,
      `Completed ${adapter.name} @ ${size.toLocaleString()} points`,
    );
    await new Promise((r) => setTimeout(r, 50));
  }

  setStatus(status, "Done ✓");

  // Render results table
  resultsContainer.innerHTML = "";
  resultsContainer.appendChild(buildResultsTable(allRuns));

  // Export button
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON";
  exportBtn.style.marginTop = "12px";
  exportBtn.addEventListener("click", () => {
    downloadJson(
      {
        library: adapter.name,
        timestamp: new Date().toISOString(),
        runs: allRuns,
      },
      `benchmark-${adapter.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
    );
  });
  resultsContainer.appendChild(exportBtn);

  // Store on window for cross-page aggregation
  (window as unknown as Record<string, unknown>)["__benchmarkResults__"] =
    allRuns;
}
