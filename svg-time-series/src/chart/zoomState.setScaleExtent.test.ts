/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

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
