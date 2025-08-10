import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { select, type Selection } from "d3-selection";
import { ChartData, IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
import "../../../test/setupDom.ts";

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
  return select(div).select("svg") as Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    unknown
  >;
}

describe("setupRender Y-axis modes", () => {
  it("combines scales when series share an axis", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      seriesAxes: [0, 0],
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i] : [10, 20, 30][i],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    expect(state.axes.y).toHaveLength(1);
    expect(state.axes.y[0].scale.domain()).toEqual([1, 30]);
  });

  it("separates scales when series use different axes", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      seriesAxes: [0, 1],
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i] : [10, 20, 30][i],
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);
    expect(state.axes.y[0].scale.domain()).toEqual([1, 3]);
    expect(state.axes.y[1].scale.domain()).toEqual([10, 30]);
  });
});
