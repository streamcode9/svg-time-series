/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import type { D3BrushEvent } from "d3-brush";
import type { D3ZoomEvent } from "d3-zoom";
import { TimeSeriesChart } from "../../src/draw.ts";
import type { IDataSource } from "../../src/draw.ts";
import { polyfillDom } from "../../src/setupDom.ts";

vi.mock("../../src/draw/brushUtils.ts", () => ({
  clearBrushSelection: () => {},
}));

await polyfillDom();

function createChart() {
  const legend = {
    init: () => {},
    highlightIndex: () => {},
    refresh: () => {},
    clearHighlight: () => {},
    destroy: () => {},
  };

  const div = document.createElement("div");
  Object.defineProperty(div, "clientWidth", { value: 200 });
  Object.defineProperty(div, "clientHeight", { value: 50 });

  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.defineProperty(svgEl, "width", { value: { baseVal: { value: 200 } } });
  Object.defineProperty(svgEl, "height", { value: { baseVal: { value: 50 } } });
  div.appendChild(svgEl);

  const dataRows = Array.from({ length: 100 }, (_, i) => [i]);
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

describe("brush zoom sourceEvent propagation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("emits afterZoom with the brush sourceEvent", () => {
    const chart = createChart();
    const afterZoom = vi.fn<(event: unknown) => void>();
    chart.interaction.on("afterZoom", (event: unknown) => {
      afterZoom(event);
    });

    const brushSourceEvent = { kind: "brush" };
    const brushEvent = {
      selection: [0, 150],
      sourceEvent: brushSourceEvent,
    } as unknown as D3BrushEvent<unknown>;

    (
      chart as unknown as { onBrushEnd: (e: D3BrushEvent<unknown>) => void }
    ).onBrushEnd(brushEvent);

    vi.runAllTimers();

    expect(afterZoom).toHaveBeenCalled();
    const lastCall = afterZoom.mock.calls[afterZoom.mock.calls.length - 1];
    expect(lastCall).toBeDefined();
    const event = lastCall?.[0] as D3ZoomEvent<SVGRectElement, unknown>;
    expect(event.sourceEvent).toBe(brushSourceEvent);
  });
});
