/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import type { D3BrushEvent } from "d3-brush";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { polyfillDom } from "../setupDom.ts";
vi.mock("../draw/brushUtils.ts", () => ({ clearBrushSelection: () => {} }));
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

describe("TimeSeriesChart event emitter", () => {
  it("emits dataUpdate and brushEnd events and supports off", () => {
    const chart = createChart();
    const interaction = chart.interaction;
    const brushCb = vi.fn();
    const dataCb = vi.fn();

    interaction.on("brushEnd", brushCb);
    interaction.on("dataUpdate", dataCb);

    chart.updateChartWithNewData([5]);
    expect(dataCb).toHaveBeenCalledWith([5]);

    interaction.off("dataUpdate", dataCb);
    chart.updateChartWithNewData([6]);
    expect(dataCb).toHaveBeenCalledTimes(1);
    interaction.on("dataUpdate", dataCb);

    const brushEvent = {
      selection: [0, 100],
    } as unknown as D3BrushEvent<unknown>;
    (
      chart as unknown as { onBrushEnd: (e: D3BrushEvent<unknown>) => void }
    ).onBrushEnd(brushEvent);
    expect(brushCb).toHaveBeenCalledTimes(1);
    const args = brushCb.mock.calls[0]![0] as [number, number];
    expect(Array.isArray(args)).toBe(true);
    expect(args[0]).toBeLessThan(args[1]);
  });
});
