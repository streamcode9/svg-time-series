/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { select, type Selection } from "d3-selection";
import { ChartData, IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
import * as domNode from "../utils/domNodeTransform.ts";
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

describe("RenderState.refresh integration", () => {
  it("updates scales, axes and series views", () => {
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
    const updateNodeSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    const xBefore = state.axes.x.scale.domain().slice();
    const yNyBefore = state.axes.y[0].scale.domain().slice();
    const ySfBefore = state.axes.y[1].scale.domain().slice();

    data.append(100, 200);
    state.refresh(data);

    const xAfter = state.axes.x.scale.domain();
    const yNyAfter = state.axes.y[0].scale.domain();
    const ySfAfter = state.axes.y[1].scale.domain();

    expect(xAfter).not.toEqual(xBefore);
    expect(yNyAfter).not.toEqual(yNyBefore);
    expect(ySfAfter).not.toEqual(ySfBefore);

    interface AxisWithScale1 {
      scale1: { domain: () => unknown };
    }
    expect(
      (state.axes.x.axis as unknown as AxisWithScale1).scale1.domain(),
    ).toEqual(xAfter);
    expect(
      (state.axisRenders[0].axis as unknown as AxisWithScale1).scale1.domain(),
    ).toEqual(yNyAfter);
    expect(
      (state.axisRenders[1].axis as unknown as AxisWithScale1).scale1.domain(),
    ).toEqual(ySfAfter);

    expect(updateNodeSpy).toHaveBeenCalledTimes(state.series.length);
    for (const s of state.series) {
      expect(updateNodeSpy.mock.calls.some((call) => call[0] === s.view)).toBe(
        true,
      );
    }

    updateNodeSpy.mockRestore();
  });
});
