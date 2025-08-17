/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { polyfillDom } from "../setupDom.ts";
import { ChartData } from "./data.ts";
import type { IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
await polyfillDom();

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

describe("buildSeries", () => {
  it("returns single series for single-axis data", () => {
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
    expect(state.series.length).toBe(1);
    expect(state.series[0]).toMatchObject({ axisIdx: 0 });
  });

  it("returns two series for shared axis", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 0],
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!,
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    expect(state.series.length).toBe(2);
    expect(state.series[0]).toMatchObject({ axisIdx: 0 });
    expect(state.series[1]).toMatchObject({ axisIdx: 0 });
  });

  it("returns two series for separate axes", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 1],
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!,
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    expect(state.series.length).toBe(2);
    expect(state.series[0]).toMatchObject({ axisIdx: 0 });
    expect(state.series[1]).toMatchObject({ axisIdx: 1 });
  });
});

describe("setupRender DOM order", () => {
  it("renders series views before axes", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesAxes: [0, 1],
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i]! : [10, 20, 30][i]!,
    };
    const data = new ChartData(source);
    setupRender(svg, data);
    const groups = svg.selectAll("g").nodes() as SVGGElement[];
    expect(groups[0]!.classList.contains("view")).toBe(true);
    expect(groups[1]!.classList.contains("view")).toBe(true);
  });
});
