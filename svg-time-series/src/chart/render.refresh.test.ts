/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("../utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
vi.mock("../axis.ts", () => {
  return {
    MyAxis: class {
      axisUp = vi.fn();
      axis = vi.fn((s: unknown) => s);
      ticks = vi.fn().mockReturnThis();
      setTickSize = vi.fn().mockReturnThis();
      setTickPadding = vi.fn().mockReturnThis();
      setScale = vi.fn().mockReturnThis();
    },
    Orientation: { Top: 0, Right: 1, Bottom: 2, Left: 3 },
  };
});

import { JSDOM } from "jsdom";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { updateNode } from "../utils/domNodeTransform.ts";
import "../setupDom.ts";
import { ChartData } from "./data.ts";
import type { IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";

function createSvg() {
  const dom = new JSDOM(`<div id="c"><svg></svg></div>`, {
    pretendToBeVisual: true,
    contentType: "text/html",
  });
  (
    globalThis as unknown as { HTMLElement: typeof dom.window.HTMLElement }
  ).HTMLElement = dom.window.HTMLElement;
  const div = dom.window.document.getElementById("c") as HTMLDivElement;
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 100 });
  return select(div).select("svg") as unknown as Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    unknown
  >;
}

describe("RenderState.refresh", () => {
  it("handles single series", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0],
      getSeries: (i) => [1, 2, 3][i]!,
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data);

    expect(state.series.length).toBe(1);
    expect(state.axes.y[state.series[0]!.axisIdx]!.scale.domain()).toEqual([
      1, 3,
    ]);
    expect(updateNodeMock).toHaveBeenCalledTimes(state.series.length);
    state.series.forEach((s, i) => {
      const t = state.axes.y[s.axisIdx]!.transform;
      expect(updateNodeMock).toHaveBeenNthCalledWith(i + 1, s.view, t.matrix);
    });
  });

  it("updates dual-axis series independently", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 1],
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!),
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data);

    expect(state.axes.y[state.series[0]!.axisIdx]!.scale.domain()).toEqual([
      1, 3,
    ]);
    expect(state.axes.y[state.series[1]!.axisIdx]!.scale.domain()).toEqual([
      10, 30,
    ]);
    expect(updateNodeMock).toHaveBeenCalledTimes(state.series.length);
    state.series.forEach((s, i) => {
      const t = state.axes.y[s.axisIdx]!.transform;
      expect(updateNodeMock).toHaveBeenNthCalledWith(i + 1, s.view, t.matrix);
    });
  });

  it("updates combined series on shared scale", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 0],
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!),
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);

    state.refresh(data);

    expect(state.axes.y).toHaveLength(1);
    expect(state.axes.y[0]!.scale.domain()).toEqual([1, 30]);
  });

  it("refreshes after data changes", () => {
    const svg = createSvg();
    const source1: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 1],
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!),
    };
    const data1 = new ChartData(source1);
    const state = setupRender(svg, data1);
    state.refresh(data1);
    const source2: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 1],
      getSeries: (i, s) => (s === 0 ? [4, 5, 6][i]! : [40, 50, 60][i]!),
    };
    const data2 = new ChartData(source2);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data2);

    expect(state.axes.y[0]!.scale.domain()).toEqual([4, 6]);
    expect(state.axes.y[1]!.scale.domain()).toEqual([40, 60]);
    expect(updateNodeMock).toHaveBeenCalledTimes(state.series.length);
  });

  it("rebuilds axis trees after data append", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0],
      getSeries: (i) => [1, 2, 3][i]!,
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);

    expect(state.axes.y[0]!.tree.query(0, 2)).toEqual({ min: 1, max: 3 });

    data.append(4);
    state.refresh(data);

    expect(state.axes.y[0]!.tree.query(0, 2)).toEqual({ min: 2, max: 4 });
  });

  it("throws when series is all Infinity", () => {
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesAxes: [0],
      getSeries: () => Infinity,
    };
    expect(() => new ChartData(source)).toThrow(/finite number or NaN/);
  });

  it("throws for dual-axis all Infinity data", () => {
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesAxes: [0, 1],
      getSeries: () => Infinity,
    };
    expect(() => new ChartData(source)).toThrow(/finite number or NaN/);
  });
});
