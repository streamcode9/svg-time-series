// @ts-expect-error -- dygraphs ships no type declarations
import Dygraph from "dygraphs";

import type { BenchmarkAdapter } from "./harness.ts";
import { runBenchmarkSuite } from "./harness.ts";
import type { BenchmarkDataset } from "./data.ts";

// ---------------------------------------------------------------------------
// Dygraphs adapter
// ---------------------------------------------------------------------------

const CHART_WIDTH = 800;
const CHART_HEIGHT = 400;

class DygraphsAdapter implements BenchmarkAdapter {
  readonly name = "Dygraphs";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private graph: any = null;

  render(container: HTMLElement, dataset: BenchmarkDataset): void {
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.style.width = `${String(CHART_WIDTH)}px`;
    wrapper.style.height = `${String(CHART_HEIGHT)}px`;
    container.appendChild(wrapper);

    // Build native Dygraph data: [[Date, ny, sf], …]
    const data: [Date, number, number][] = [];
    for (let i = 0; i < dataset.dates.length; i++) {
      data.push([dataset.dates[i]!, dataset.ny[i]!, dataset.sf[i]!]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.graph = new Dygraph(wrapper, data, {
      labels: ["Date", "NY", "SF"],
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      colors: ["rgb(136,204,91)", "rgb(96,77,196)"],
      legend: "never",
      animatedZooms: false,
    });
  }

  zoom(factor: number): void {
    if (!this.graph) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const [xMin, xMax] = this.graph.xAxisRange() as [number, number];
    const center = (xMin + xMax) / 2;
    const halfRange = (xMax - xMin) / (2 * factor);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.graph.updateOptions({
      dateWindow: [center - halfRange, center + halfRange],
    });
  }

  pan(fraction: number): void {
    if (!this.graph) return;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const [xMin, xMax] = this.graph.xAxisRange() as [number, number];
    const shift = (xMax - xMin) * fraction;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.graph.updateOptions({
      dateWindow: [xMin + shift, xMax + shift],
    });
  }

  destroy(): void {
    if (this.graph) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.graph.destroy();
      this.graph = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

void runBenchmarkSuite(new DygraphsAdapter());
