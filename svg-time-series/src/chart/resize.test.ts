/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, type Mock } from "vitest";

vi.mock("../utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
interface AxisMock {
  axisUp: Mock;
}
const axisInstances: AxisMock[] = [];
vi.mock("../axis.ts", () => {
  return {
    MyAxis: class {
      axisUp = vi.fn();
      axis = vi.fn((s: unknown) => s);
      ticks = vi.fn().mockReturnThis();
      setTickSize = vi.fn().mockReturnThis();
      setTickPadding = vi.fn().mockReturnThis();
      setScale = vi.fn().mockReturnThis();
      constructor() {
        axisInstances.push(this);
      }
    },
    Orientation: { Bottom: 0, Right: 1, Left: 2 },
  };
});

import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { SeriesRenderer } from "./seriesRenderer.ts";
import "../setupDom.ts";

describe("TimeSeriesChart.resize", () => {
  it("updates axes, paths, and legend", () => {
    const renderSpy = vi.spyOn(SeriesRenderer.prototype, "draw");

    const div = document.createElement("div");
    Object.defineProperty(div, "clientWidth", { value: 100 });
    Object.defineProperty(div, "clientHeight", { value: 100 });
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    div.appendChild(svgEl);

    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 1,
      seriesAxes: [0],
      getSeries: (i) => [1, 2, 3][i]!,
    };

    const legend = {
      init: () => {},
      highlightIndex: () => {},
      refresh: vi.fn(),
      clearHighlight: () => {},
      destroy: () => {},
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
    interface ChartInternal {
      zoomState: { refresh: Mock };
    }
    const chartInternal = chart as unknown as ChartInternal;
    const zoomRefreshSpy = vi.spyOn(chartInternal.zoomState, "refresh");

    renderSpy.mockClear();
    axisInstances.forEach((a) => a.axisUp.mockClear());
    legend.refresh.mockClear();
    zoomRefreshSpy.mockClear();

    chart.resize({ width: 200, height: 150 });

    axisInstances.forEach((a) => {
      expect(a.axisUp).toHaveBeenCalled();
    });
    expect(renderSpy).toHaveBeenCalled();
    expect(legend.refresh).toHaveBeenCalled();
    expect(zoomRefreshSpy).toHaveBeenCalled();
  });

  it("uses explicit dimensions for zoom extents and axes", () => {
    const div = document.createElement("div");
    Object.defineProperty(div, "clientWidth", { value: 100 });
    Object.defineProperty(div, "clientHeight", { value: 100 });
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    div.appendChild(svgEl);

    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 1,
      seriesAxes: [0],
      getSeries: (i) => [1, 2, 3][i]!,
    };

    const legend = {
      init: () => {},
      highlightIndex: () => {},
      refresh: () => {},
      clearHighlight: () => {},
      destroy: () => {},
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

    interface ChartInternal {
      zoomState: { updateExtents: Mock };
      state: {
        axes: {
          x: { scale: { range: () => unknown } };
          y: Array<{
            transform: { onViewPortResize: Mock };
            scale: { range: () => unknown };
          }>;
        };
        dimensions: { width: number; height: number };
      };
    }
    const chartInternal = chart as unknown as ChartInternal;
    const updateSpy = vi.spyOn(chartInternal.zoomState, "updateExtents");
    const resizeSpy = vi.spyOn(
      chartInternal.state.axes.y[0]!.transform,
      "onViewPortResize",
    );

    updateSpy.mockClear();
    resizeSpy.mockClear();

    chart.resize({ width: 250, height: 120 });

    expect(updateSpy).toHaveBeenCalledWith({ width: 250, height: 120 });
    expect(chartInternal.state.dimensions).toEqual({ width: 250, height: 120 });

    interface AxisRange {
      x(): { toArr(): [number, number] };
      y(): { toArr(): [number, number] };
    }
    const arg = resizeSpy.mock.calls.at(0)![0] as unknown as AxisRange;
    expect(arg.x().toArr()).toEqual([0, 250]);
    expect(arg.y().toArr()).toEqual([120, 0]);

    expect(chartInternal.state.axes.x.scale.range()).toEqual([0, 250]);
    expect(chartInternal.state.axes.y[0]!.scale.range()).toEqual([120, 0]);
  });
});
