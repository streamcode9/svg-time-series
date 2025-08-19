/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";

vi.mock("../src/utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
vi.mock("../src/chart/zoomState.ts", () => {
  return {
    ZoomState: vi.fn().mockImplementation(() => ({
      refresh: vi.fn(),
      destroy: vi.fn(),
      setScaleExtent: vi.fn(),
      zoom: vi.fn(),
      reset: vi.fn(),
      updateExtents: vi.fn(),
      zoomBehavior: { transform: vi.fn() },
    })),
  };
});

import { TimeSeriesChart, type IDataSource } from "../src/draw.ts";
import { polyfillDom } from "../src/setupDom.ts";
await polyfillDom();

function createLegend() {
  return {
    init() {},
    highlightIndex() {},
    refresh() {},
    clearHighlight() {},
    destroy: vi.fn(),
  };
}

function createChart() {
  const legend = createLegend();
  const div = document.createElement("div");
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 50 });
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  div.appendChild(svgEl);

  const dataRows = [[1], [2], [3]];
  const source: IDataSource = {
    startTime: 0,
    timeStep: 1,
    length: dataRows.length,
    seriesAxes: [0],
    getSeries: (i, seriesIdx) => dataRows[i]![seriesIdx]!,
  };

  const chart = new TimeSeriesChart(
    select(svgEl) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >,
    source,
    legend,
  );

  return { chart, svgEl, legend };
}

describe("TimeSeriesChart dispose", () => {
  it("removes zoom and brush elements", () => {
    const { chart, svgEl, legend } = createChart();

    expect(svgEl.querySelector(".zoom-overlay")).not.toBeNull();
    expect(svgEl.querySelector(".brush-layer")).not.toBeNull();

    chart.interaction.dispose();

    expect(svgEl.querySelector(".zoom-overlay")).toBeNull();
    expect(svgEl.querySelector(".brush-layer")).toBeNull();
    expect(legend.destroy).toHaveBeenCalled();
  });
});
