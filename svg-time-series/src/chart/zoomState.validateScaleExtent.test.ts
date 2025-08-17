/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

describe("ZoomState.validateScaleExtent", () => {
  it("rejects non-array inputs", () => {
    expect(() => {
      ZoomState.validateScaleExtent(5 as unknown);
    }).toThrow(/Received: 5/);
  });

  it("rejects arrays without exactly two elements", () => {
    expect(() => {
      ZoomState.validateScaleExtent([1] as unknown);
    }).toThrow(/Received: \[1\]/);
    expect(() => {
      ZoomState.validateScaleExtent([1, 2, 3] as unknown);
    }).toThrow(/Received: \[1,2,3\]/);
  });

  it("rejects non-positive numbers", () => {
    expect(() => {
      ZoomState.validateScaleExtent([0, 2]);
    }).toThrow(/Received: \[0,2\]/);
  });

  it("rejects non-number or non-finite values", () => {
    expect(() => {
      ZoomState.validateScaleExtent(["1", 2] as unknown);
    }).toThrow(/Received: \[1,2\]/);
    expect(() => {
      ZoomState.validateScaleExtent([1, "2"] as unknown);
    }).toThrow(/Received: \[1,2\]/);
    expect(() => {
      ZoomState.validateScaleExtent([NaN, 2]);
    }).toThrow(/Received: \[NaN,2\]/);
    expect(() => {
      ZoomState.validateScaleExtent([1, Infinity]);
    }).toThrow(/Received: \[1,Infinity\]/);
  });

  it.each([
    [2, 1],
    [1, 1],
  ])("rejects when min >= max %j", (a, b) => {
    expect(() => {
      ZoomState.validateScaleExtent([a, b]);
    }).toThrow(new RegExp(`Received: \\[${String(a)},${String(b)}\\]`));
  });

  it("returns extent when valid", () => {
    expect(ZoomState.validateScaleExtent([1, 2])).toEqual([1, 2]);
  });
});

describe("ZoomState.setScaleExtent", () => {
  it("refreshes the chart after updating scale extent", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const refreshChart = vi.fn();
    const state = {
      dimensions: { width: 100, height: 100 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
      setDimensions: vi.fn(),
    } as unknown as RenderState;
    const zs = new ZoomState(
      rect as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      state,
      refreshChart,
    );
    refreshChart.mockClear();
    zs.setScaleExtent([0.5, 5]);
    expect(refreshChart).toHaveBeenCalledTimes(1);
  });
});
