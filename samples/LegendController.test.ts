/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";

import { LegendController } from "./LegendController.ts";
import { ChartData, IDataSource } from "../svg-time-series/src/chart/data.ts";
import { setupRender } from "../svg-time-series/src/chart/render.ts";
import * as domNode from "../svg-time-series/src/utils/domNodeTransform.ts";
import "../test/setupDom.ts";

function createSvgAndLegend() {
  const dom = new JSDOM(
    `<div id="c"><svg></svg></div><div id="l"><div class="chart-legend__time"></div><div class="chart-legend__green_value"></div><div class="chart-legend__blue_value"></div></div>`,
    {
      pretendToBeVisual: true,
      contentType: "text/html",
    },
  );
  (
    globalThis as unknown as { HTMLElement: typeof dom.window.HTMLElement }
  ).HTMLElement = dom.window.HTMLElement;
  const div = dom.window.document.getElementById("c") as HTMLDivElement;
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 100 });
  const svg = select<HTMLDivElement, unknown>(div).select<
    SVGSVGElement,
    unknown
  >("svg");
  const legendDiv = select<HTMLElement, unknown, HTMLElement, unknown>(
    dom.window.document.getElementById("l") as HTMLDivElement,
  );
  return { svg, legendDiv };
}

describe("LegendController", () => {
  it("places highlight dot with correct y and color", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 1,
      getSeries: (i) => [10, 20][i]!,
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    select(state.series[0]!.path as SVGPathElement).attr("stroke", "green");
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      length: data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx].transform,
      })),
    });

    const updateSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    lc.highlightIndex(1);

    const lastCall = updateSpy.mock.calls[updateSpy.mock.calls.length - 1];
    const matrix = lastCall[1] as DOMMatrix;
    const modelPoint = new DOMPoint(1, data.getPoint(1).values[0]);
    const expected = modelPoint.matrixTransform(
      state.axes.y[0].transform.matrix,
    );
    expect(matrix.e).toBeCloseTo(expected.x);
    expect(matrix.f).toBeCloseTo(expected.y);
    const circle = svg.select("circle").node() as SVGCircleElement;
    expect(circle.getAttribute("stroke")).toBe("green");
    expect(circle.getAttribute("r")).toBe("2");

    updateSpy.mockRestore();
    lc.destroy();
  });

  it("handles legacy tuple return from getPoint", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 1,
      getSeries: (i) => [10, 20][i]!,
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const originalGetPoint = data.getPoint.bind(data);
    // mimic old API returning [timestamp, value...]
    data.getPoint = ((idx: number) => {
      const { values, timestamp } = originalGetPoint(idx);
      return [timestamp, ...values] as [number, ...number[]];
    }) as unknown as typeof data.getPoint;
    const state = setupRender(svg, data);
    select(state.series[0]!.path as SVGPathElement).attr("stroke", "green");
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      length: data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx].transform,
      })),
    });

    const updateSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    expect(() => {
      lc.highlightIndex(1);
    }).not.toThrow();
    updateSpy.mockRestore();
    lc.destroy();
  });

  it("ignores results missing values array", () => {
    const { svg, legendDiv } = createSvgAndLegend();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 1,
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
    select(state.series[0]!.path as SVGPathElement).attr("stroke", "green");
    const lc = new LegendController(legendDiv);
    lc.init({
      getPoint: data.getPoint.bind(data),
      length: data.length,
      series: state.series.map((s) => ({
        path: s.path,
        transform: state.axes.y[s.axisIdx].transform,
      })),
    });

    expect(() => {
      lc.highlightIndex(1);
    }).not.toThrow();
    lc.destroy();
  });
});
