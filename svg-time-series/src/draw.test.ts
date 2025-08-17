/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { D3BrushEvent } from "d3-brush";

vi.mock("./utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
vi.mock("./chart/zoomState.ts", () => {
  return {
    ZoomState: vi.fn().mockImplementation((...args: unknown[]) => {
      const refreshChart = args[2] as () => void;
      return {
        refresh: vi.fn(() => {
          refreshChart();
        }),
        destroy: vi.fn(),
        setScaleExtent: vi.fn(),
        zoom: vi.fn(),
        reset: vi.fn(),
        updateExtents: vi.fn(),
        zoomBehavior: { transform: vi.fn() },
      };
    }),
  };
});
vi.mock("./draw/brushUtils.ts", () => ({
  clearBrushSelection: vi.fn(),
}));

import { TimeSeriesChart } from "./draw.ts";
import type { IDataSource } from "./draw.ts";
import { clearBrushSelection } from "./draw/brushUtils.ts";
import { polyfillDom } from "./setupDom.ts";
await polyfillDom();

function createLegend() {
  return {
    init: vi.fn(),
    highlightIndex: vi.fn(),
    highlightIndexRaf: vi.fn(),
    refresh: vi.fn(),
    clearHighlight: vi.fn(),
    destroy: vi.fn(),
  };
}

function createChart(options?: {
  legend?: ReturnType<typeof createLegend>;
  mouseMoveHandler?: (event: MouseEvent) => void;
}) {
  const legend = options?.legend ?? createLegend();
  const mouseMoveHandler = options?.mouseMoveHandler ?? vi.fn();

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
    undefined,
    mouseMoveHandler,
  );

  return { chart, svgEl, legend, mouseMoveHandler };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TimeSeriesChart", () => {
  it("appends data and redraws on update", () => {
    const { chart } = createChart();
    const internal = chart as unknown as {
      data: { append: ReturnType<typeof vi.fn>; data: number[][] };
      state: { seriesRenderer: { draw: ReturnType<typeof vi.fn> } };
    };
    const appendSpy = vi.spyOn(internal.data, "append");
    const drawSpy = vi.spyOn(internal.state.seriesRenderer, "draw");

    appendSpy.mockClear();
    drawSpy.mockClear();

    chart.updateChartWithNewData([10]);

    expect(appendSpy).toHaveBeenCalledWith(10);
    expect(drawSpy).toHaveBeenCalledWith(internal.data.data);
  });

  it("throws when provided fewer values than series count", () => {
    const { chart } = createChart();
    expect(() => {
      chart.updateChartWithNewData([]);
    }).toThrow(
      "TimeSeriesChart.updateChartWithNewData expected 1 values, received 0",
    );
  });

  it("throws when provided more values than series count", () => {
    const { chart } = createChart();
    expect(() => {
      chart.updateChartWithNewData([10, 20]);
    }).toThrow(
      "TimeSeriesChart.updateChartWithNewData expected 1 values, received 2",
    );
  });

  it("resizes svg and refreshes render state", () => {
    const { chart, svgEl, legend } = createChart();
    const internal = chart as unknown as {
      state: {
        resize: ReturnType<typeof vi.fn>;
        refresh: ReturnType<typeof vi.fn>;
        seriesRenderer: { draw: ReturnType<typeof vi.fn> };
      };
      zoomState: {
        refresh: ReturnType<typeof vi.fn>;
        setScaleExtent: ReturnType<typeof vi.fn>;
        updateExtents: ReturnType<typeof vi.fn>;
      };
      zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
    };
    const zoomInstance = internal.zoomState;
    const resizeSpy = vi.spyOn(internal.state, "resize");
    const refreshSpy = vi.spyOn(internal.state, "refresh");
    const drawSpy = vi.spyOn(internal.state.seriesRenderer, "draw");
    const zoomRefreshSpy = vi.spyOn(zoomInstance, "refresh");
    const updateExtentsSpy = vi.spyOn(zoomInstance, "updateExtents");
    const legendRefreshSpy = vi.spyOn(legend, "refresh");

    resizeSpy.mockClear();
    refreshSpy.mockClear();
    drawSpy.mockClear();
    zoomRefreshSpy.mockClear();
    updateExtentsSpy.mockClear();
    legendRefreshSpy.mockClear();

    chart.resize({ width: 200, height: 150 });

    expect(svgEl.getAttribute("width")).toBe("200");
    expect(svgEl.getAttribute("height")).toBe("150");
    expect(resizeSpy).toHaveBeenCalledTimes(1);
    expect(resizeSpy.mock.calls[0]![0]).toEqual({ width: 200, height: 150 });
    expect(resizeSpy.mock.calls[0]![1]).toBe(internal.zoomArea);
    expect(updateExtentsSpy).toHaveBeenCalledWith({ width: 200, height: 150 });
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(drawSpy).not.toHaveBeenCalled();
    expect(zoomRefreshSpy).toHaveBeenCalledTimes(1);
    expect(legendRefreshSpy).toHaveBeenCalledTimes(1);

    const overlay = internal.zoomArea.node()!;
    expect(overlay.getAttribute("width")).toBe("200");
    expect(overlay.getAttribute("height")).toBe("150");
  });

  it("clamps hover index and forwards to legend", () => {
    const legend = createLegend();
    const { chart } = createChart({ legend });
    const internal = chart as unknown as {
      state: { screenToModelX: ReturnType<typeof vi.fn> };
      data: { length: number };
    };
    vi.spyOn(internal.state, "screenToModelX").mockReturnValue(10);

    chart.onHover(5);

    expect(legend.highlightIndexRaf).toHaveBeenCalledWith(
      internal.data.length - 1,
    );
    expect(legend.highlightIndex).not.toHaveBeenCalled();
  });

  it("forwards scale extent to zoom state", () => {
    const { chart } = createChart();
    const internal = chart as unknown as {
      zoomState: { setScaleExtent: ReturnType<typeof vi.fn> };
    };

    chart.setScaleExtent([1, 3]);

    expect(internal.zoomState.setScaleExtent).toHaveBeenCalledWith([1, 3]);
  });

  it("removes listeners and destroys legend on dispose", () => {
    const legend = createLegend();
    const mouseMove = vi.fn();
    const { chart } = createChart({ legend, mouseMoveHandler: mouseMove });
    const internal = chart as unknown as {
      zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
    };
    const rectNode = internal.zoomArea.node()!;

    rectNode.dispatchEvent(new MouseEvent("mousemove"));
    expect(mouseMove).toHaveBeenCalled();

    mouseMove.mockClear();
    chart.dispose();
    rectNode.dispatchEvent(new MouseEvent("mousemove"));

    expect(mouseMove).not.toHaveBeenCalled();
    expect(legend.destroy).toHaveBeenCalled();
  });

  it("toggles cursor classes on the zoom overlay", () => {
    const { chart } = createChart();
    const internal = chart as unknown as {
      zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
    };
    const rectNode = internal.zoomArea.node()!;

    expect(rectNode.getAttribute("class")).toContain("zoom-overlay");
    expect(rectNode.classList.contains("cursor-grab")).toBe(true);
    expect(rectNode.style.pointerEvents).toBe("all");
    expect(rectNode.getAttribute("fill")).toBe("none");

    rectNode.dispatchEvent(new Event("pointerdown"));
    expect(rectNode.classList.contains("cursor-grabbing")).toBe(true);
    expect(rectNode.classList.contains("cursor-grab")).toBe(false);

    rectNode.dispatchEvent(new Event("pointerup"));
    expect(rectNode.classList.contains("cursor-grab")).toBe(true);
    expect(rectNode.classList.contains("cursor-grabbing")).toBe(false);
  });

  it("clears brush and skips zoom when selection collapses", () => {
    const { chart } = createChart();
    const internal = chart as unknown as {
      state: {
        screenToModelX: ReturnType<typeof vi.fn>;
        xTransform: { toScreenFromModelX: ReturnType<typeof vi.fn> };
      };
      zoomState: { zoomBehavior: { transform: ReturnType<typeof vi.fn> } };
      onBrushEnd: (event: D3BrushEvent<unknown>) => void;
    };
    vi.spyOn(internal.state, "screenToModelX").mockReturnValue(0);
    vi.spyOn(internal.state.xTransform, "toScreenFromModelX").mockReturnValue(
      10,
    );
    const transformSpy = vi.spyOn(internal.zoomState.zoomBehavior, "transform");

    internal.onBrushEnd({
      selection: [0, 10],
    } as unknown as D3BrushEvent<unknown>);

    expect(transformSpy).not.toHaveBeenCalled();
    expect(clearBrushSelection).toHaveBeenCalled();
    expect(chart.getSelectedTimeWindow()).toBeNull();
  });

  it("returns a cloned selected time window", () => {
    const { chart } = createChart();
    (
      chart as unknown as { selectedTimeWindow: [number, number] }
    ).selectedTimeWindow = [1, 2];
    const window1 = chart.getSelectedTimeWindow();
    expect(window1).toEqual([1, 2]);
    if (window1) {
      window1[0] = 100;
    }
    expect(chart.getSelectedTimeWindow()).toEqual([1, 2]);
  });
});
