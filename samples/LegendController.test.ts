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
import { Matrix, Point } from "../test/setupDom.ts";

function createSvgAndLegend() {
  const dom = new JSDOM(
    `<div id="c"><svg></svg></div><div id="l"><div class="chart-legend__time"></div><div class="chart-legend__green_value"></div><div class="chart-legend__blue_value"></div></div>`,
    {
      pretendToBeVisual: true,
      contentType: "text/html",
    },
  );
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  const div = dom.window.document.getElementById("c") as any;
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 100 });
  const svg = select(div).select("svg");
  const legendDiv = select(dom.window.document.getElementById("l")!);
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
      getSeries: (i) => [10, 20][i],
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const state = setupRender(svg as any, data);
    select(state.series[0].path).attr("stroke", "green");
    const lc = new LegendController(legendDiv as any);
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
    const matrix = lastCall[1] as Matrix;
    const modelPoint = new Point(1, data.getPoint(1).values[0]);
    const expected = modelPoint.matrixTransform(
      state.axes.y[0].transform.matrix as any,
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
      getSeries: (i) => [10, 20][i],
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const originalGetPoint = data.getPoint.bind(data);
    // mimic old API returning [timestamp, value...]
    data.getPoint = ((idx: number) => {
      const { values, timestamp } = originalGetPoint(idx);
      return [timestamp, ...values] as any;
    }) as any;
    const state = setupRender(svg as any, data);
    select(state.series[0].path).attr("stroke", "green");
    const lc = new LegendController(legendDiv as any);
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
      getSeries: (i) => [10, 20][i],
      seriesAxes: [0],
    };
    const data = new ChartData(source);
    const originalGetPoint = data.getPoint.bind(data);
    // mimic buggy API returning only a timestamp
    data.getPoint = ((idx: number) => {
      const { timestamp } = originalGetPoint(idx);
      return { timestamp } as any;
    }) as any;
    const state = setupRender(svg as any, data);
    select(state.series[0].path).attr("stroke", "green");
    const lc = new LegendController(legendDiv as any);
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
