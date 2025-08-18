/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";
import { zoomIdentity } from "d3-zoom";

import type { IDataSource } from "../svg-time-series/src/chart/data.ts";
import { ChartData } from "../svg-time-series/src/chart/data.ts";
import { setupRender } from "../svg-time-series/src/chart/render.ts";
import * as domNode from "../svg-time-series/src/utils/domNodeTransform.ts";
import { createDiv } from "../test/domUtils.ts";
import { polyfillDom } from "../test/setupDom.ts";

import { LegendController } from "./LegendController.ts";

await polyfillDom();

afterEach(() => {
  vi.restoreAllMocks();
});

function createSvgAndLegend() {
  const { dom } = createDiv(
    '<div id="c"><svg></svg></div><div id="l"><div class="chart-legend__time"></div><div class="chart-legend__green_value"></div><div class="chart-legend__blue_value"></div></div>',
  );
  const container = dom.window.document.getElementById("c") as HTMLDivElement;
  Object.defineProperty(container, "clientWidth", { value: 100 });
  Object.defineProperty(container, "clientHeight", { value: 100 });
  const svg = select<HTMLDivElement, unknown>(container).select(
    "svg",
  ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
  const legendDiv = select(
    dom.window.document.getElementById("l") as HTMLDivElement,
  ) as unknown as Selection<HTMLElement, unknown, HTMLElement, unknown>;
  return { svg, legendDiv };
}

describe("LegendController", () => {
  it("places highlight dot with correct y and color", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      getSeries: (i) => [10, 20][i]!,
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    select<SVGPathElement, unknown>(state.series[0]!.path).attr(
      "stroke",
      "green",
    );
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      getLength: () => data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx]!.transform,
      })),
    });

    const updateSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    lc.highlightIndex(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const circle = svg.select("circle").node() as SVGCircleElement;
    const lastCall = updateSpy.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(circle);
    const matrix = lastCall[1];
    const modelPoint = new DOMPoint(1, data.getPoint(1).values[0]);
    const expected = modelPoint.matrixTransform(
      state.axes.y[0]!.transform.matrix,
    );
    expect(matrix.e).toBeCloseTo(expected.x);
    expect(matrix.f).toBeCloseTo(expected.y);
    expect(circle.getAttribute("stroke")).toBe("green");
    expect(circle.getAttribute("r")).toBe("2");

    updateSpy.mockRestore();
    lc.destroy();
  });

  it("ignores results missing values array", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      getSeries: (i) => [10, 20][i]!,
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const originalGetPoint = data.getPoint.bind(data);
    // mimic buggy API returning only a timestamp
    data.getPoint = ((idx: number) => {
      const { timestamp } = originalGetPoint(idx);
      return { timestamp } as { timestamp: number } & Record<string, unknown>;
    }) as unknown as typeof data.getPoint;
    const state = setupRender(svg, data);
    select<SVGPathElement, unknown>(state.series[0]!.path).attr(
      "stroke",
      "green",
    );
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      getLength: () => data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx]!.transform,
      })),
    });

    const updateSpy = vi.spyOn(domNode, "updateNode");
    const circleCount = svg.selectAll("circle").size();

    expect(() => {
      lc.highlightIndex(1);
    }).not.toThrow();

    expect(updateSpy).not.toHaveBeenCalled();
    expect(svg.selectAll("circle").size()).toBe(circleCount);

    updateSpy.mockRestore();
    lc.destroy();
  });

  it("updates dot position when transform changes on refresh", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      getSeries: (i) => [10, 20][i]!,
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    select<SVGPathElement, unknown>(state.series[0]!.path).attr(
      "stroke",
      "green",
    );
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      getLength: () => data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx]!.transform,
      })),
    });

    vi.useFakeTimers();
    const updateSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    lc.highlightIndex(1);
    vi.runAllTimers();
    const initialMatrix = updateSpy.mock.calls.at(-1)![1];
    updateSpy.mockClear();

    state.axes.y[0]!.transform.onZoomPan(zoomIdentity.translate(10, 0));
    lc.refresh();
    vi.runAllTimers();

    expect(updateSpy).toHaveBeenCalled();
    const updatedMatrix = updateSpy.mock.calls.at(-1)![1];
    const modelPoint = new DOMPoint(1, data.getPoint(1).values[0]);
    const expected = modelPoint.matrixTransform(
      state.axes.y[0]!.transform.matrix,
    );
    expect(updatedMatrix.e).toBeCloseTo(expected.x);
    expect(updatedMatrix.f).toBeCloseTo(expected.y);
    expect(updatedMatrix.e).not.toBeCloseTo(initialMatrix.e);

    updateSpy.mockRestore();
    vi.useRealTimers();
    lc.destroy();
  });

  it("does not update DOM when highlighting the same index repeatedly", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      getSeries: (i, s) =>
        (
          [
            [10, 30],
            [20, 40],
          ] as const
        )[i]![s]!,
      seriesAxes: [0, 0],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    select<SVGPathElement, unknown>(state.series[0]!.path).attr(
      "stroke",
      "green",
    );
    select<SVGPathElement, unknown>(state.series[1]!.path).attr(
      "stroke",
      "blue",
    );
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      getLength: () => data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx]!.transform,
      })),
    });

    vi.useFakeTimers();
    const updateSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});
    const timeNode = legendDiv
      .select(".chart-legend__time")
      .node() as HTMLElement;
    const greenNode = legendDiv
      .select(".chart-legend__green_value")
      .node() as HTMLElement;
    const blueNode = legendDiv
      .select(".chart-legend__blue_value")
      .node() as HTMLElement;
    const timeSpy = vi.spyOn(timeNode, "textContent", "set");
    const greenSpy = vi.spyOn(greenNode, "textContent", "set");
    const blueSpy = vi.spyOn(blueNode, "textContent", "set");
    const dots = svg.selectAll("circle").nodes() as SVGCircleElement[];
    const greenDisplaySpy = vi.spyOn(dots[0]!.style, "display", "set");
    const blueDisplaySpy = vi.spyOn(dots[1]!.style, "display", "set");

    vi.runAllTimers();

    try {
      lc.highlightIndexRaf(1);
      vi.runAllTimers();
      const updateCalls = updateSpy.mock.calls.length;

      lc.highlightIndexRaf(1);
      vi.runAllTimers();

      expect(updateSpy.mock.calls.length).toBe(updateCalls);
      expect(timeSpy).toHaveBeenCalledTimes(1);
      expect(greenSpy).toHaveBeenCalledTimes(1);
      expect(blueSpy).toHaveBeenCalledTimes(1);
      expect(greenDisplaySpy).toHaveBeenCalledTimes(1);
      expect(blueDisplaySpy).toHaveBeenCalledTimes(1);
    } finally {
      updateSpy.mockRestore();
      timeSpy.mockRestore();
      greenSpy.mockRestore();
      blueSpy.mockRestore();
      greenDisplaySpy.mockRestore();
      blueDisplaySpy.mockRestore();
      vi.useRealTimers();
      lc.destroy();
    }
  });
});
