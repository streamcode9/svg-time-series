/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import { zoomTransform, zoomIdentity } from "d3-zoom";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { polyfillDom } from "../setupDom.ts";
await polyfillDom();

function createLegend() {
  return {
    init: () => {},
    highlightIndex: () => {},
    refresh: () => {},
    clearHighlight: () => {},
    destroy: () => {},
  };
}

function createChart() {
  const legend = createLegend();
  const div = document.createElement("div");
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 50 });
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.defineProperty(svgEl, "width", { value: { baseVal: { value: 100 } } });
  Object.defineProperty(svgEl, "height", { value: { baseVal: { value: 50 } } });
  div.appendChild(svgEl);

  const dataRows = [[1], [2], [3], [4]];
  const source: IDataSource = {
    startTime: 0,
    timeStep: 1,
    length: dataRows.length,
    seriesAxes: [0],
    getSeries: (i, s) => dataRows[i]![s]!,
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
  return chart;
}

describe("interaction.zoomToTimeWindow", () => {
  it("applies zoom transform and updates selected window", () => {
    const chart = createChart();
    const interaction = chart.interaction;

    const ok = interaction.zoomToTimeWindow(1, 3);

    const internal = chart as unknown as {
      data: { timeToIndex: (d: Date) => number };
      state: {
        axes: { x: { scale: (v: number) => number } };
        getDimensions: () => { width: number };
      };
      zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
    };
    const m0 = internal.data.timeToIndex(new Date(1));
    const m1 = internal.data.timeToIndex(new Date(3));
    const sx0 = internal.state.axes.x.scale(m0);
    const sx1 = internal.state.axes.x.scale(m1);
    const { width } = internal.state.getDimensions();
    const k = width / (sx1 - sx0);
    const expected = zoomIdentity.scale(k).translate(-sx0, 0);
    const t = zoomTransform(internal.zoomArea.node()!);
    expect(ok).toBe(true);
    expect(t.k).toBeCloseTo(expected.k);
    expect(t.x).toBeCloseTo(expected.x);
    expect(interaction.getSelectedTimeWindow()).toEqual([1, 3]);
  });

  it("returns false and clears selection for invalid window", () => {
    const chart = createChart();
    const interaction = chart.interaction;

    expect(interaction.zoomToTimeWindow(1, 3)).toBe(true);
    expect(interaction.getSelectedTimeWindow()).toEqual([1, 3]);

    const ok = interaction.zoomToTimeWindow(1, 1);
    expect(ok).toBe(false);
    expect(interaction.getSelectedTimeWindow()).toBeNull();
  });
});
