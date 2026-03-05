import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import { TimeSeriesChart } from "svg-time-series";
import type { IDataSource, ILegendController } from "svg-time-series";

import type { BenchmarkAdapter } from "./harness.ts";
import { runBenchmarkSuite } from "./harness.ts";
import type { BenchmarkDataset } from "./data.ts";

// ---------------------------------------------------------------------------
// No-op legend controller (benchmarks don't need legend rendering)
// ---------------------------------------------------------------------------

const noopLegend: ILegendController = {
  init() {},
  highlightIndex() {},
  refresh() {},
  clearHighlight() {},
  destroy() {},
};

// ---------------------------------------------------------------------------
// svg-time-series adapter
// ---------------------------------------------------------------------------

const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;

class SvgTimeSeriesAdapter implements BenchmarkAdapter {
  readonly name = "svg-time-series";

  private chart: TimeSeriesChart | null = null;
  private dataset: BenchmarkDataset | null = null;

  render(container: HTMLElement, dataset: BenchmarkDataset): void {
    this.dataset = dataset;
    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "chart-drawing";
    wrapper.style.width = `${String(CHART_WIDTH)}px`;
    wrapper.style.height = `${String(CHART_HEIGHT)}px`;
    container.appendChild(wrapper);

    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgEl.setAttribute("width", String(CHART_WIDTH));
    svgEl.setAttribute("height", String(CHART_HEIGHT));
    wrapper.appendChild(svgEl);

    const svgSel = select(svgEl);

    const startTime = dataset.dates[0]!.getTime();
    const timeStep = 86400000;
    const source: IDataSource = {
      startTime,
      timeStep,
      length: dataset.dates.length,
      seriesAxes: [0, 0],
      getSeries: (i: number, seriesIdx: number) =>
        seriesIdx === 0
          ? dataset.ny[i % dataset.ny.length]!
          : dataset.sf[i % dataset.sf.length]!,
    };

    this.chart = new TimeSeriesChart(
      svgSel as unknown as Selection<
        SVGSVGElement,
        unknown,
        HTMLElement,
        unknown
      >,
      source,
      noopLegend,
    );
  }

  zoom(factor: number): void {
    if (!this.chart || !this.dataset) return;
    const len = this.dataset.dates.length;
    const center = Math.floor(len / 2);
    const halfWindow = Math.floor(len / (2 * factor));
    const startIdx = Math.max(0, center - halfWindow);
    const endIdx = Math.min(len - 1, center + halfWindow);
    this.chart.interaction.zoomToTimeWindow(
      this.dataset.dates[startIdx]!,
      this.dataset.dates[endIdx]!,
    );
  }

  pan(fraction: number): void {
    if (!this.chart || !this.dataset) return;
    const len = this.dataset.dates.length;
    const shift = Math.floor(len * fraction);
    const start = Math.min(shift, len - 2);
    const end = Math.min(shift + Math.floor(len / 2), len - 1);
    this.chart.interaction.zoomToTimeWindow(
      this.dataset.dates[start]!,
      this.dataset.dates[end]!,
    );
  }

  destroy(): void {
    if (this.chart) {
      this.chart.interaction.dispose();
      this.chart = null;
    }
    this.dataset = null;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

void runBenchmarkSuite(new SvgTimeSeriesAdapter());
