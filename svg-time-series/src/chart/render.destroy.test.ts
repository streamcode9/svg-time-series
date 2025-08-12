/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { ChartData } from "./data.ts";
import type { IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
import "../setupDom.ts";

function createSvg(): Selection<SVGSVGElement, unknown, HTMLElement, unknown> {
  const parent = document.createElement("div");
  Object.defineProperty(parent, "clientWidth", { value: 100 });
  Object.defineProperty(parent, "clientHeight", { value: 100 });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  parent.appendChild(svg);
  return select(svg) as unknown as Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    unknown
  >;
}

describe("RenderState.destroy", () => {
  it("removes DOM elements and clears arrays", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 1,
      seriesAxes: [0],
      getSeries: (i, _s) => [1, 2][i]!,
    };
    const data = new ChartData(source);
    const state = setupRender(svg, data);

    expect(svg.selectAll("path").nodes().length).toBeGreaterThan(0);
    expect(svg.selectAll("g.axis").nodes().length).toBeGreaterThan(0);

    state.destroy();

    expect(svg.selectAll("path").nodes().length).toBe(0);
    expect(svg.selectAll("g.axis").nodes().length).toBe(0);
    expect(state.series.length).toBe(0);
    expect(state.axisRenders.length).toBe(0);
    expect(state.axes.y.length).toBe(0);
    expect(state.axes.x.g).toBeUndefined();
  });
});
