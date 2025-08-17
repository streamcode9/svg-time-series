/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { select, type Selection } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

describe("ZoomState.updateExtents removed element", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("exits early when the zoom area element is removed", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
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
      vi.fn(),
    );

    rect.remove();
    zs["zoomArea"] = select(svg).select<SVGRectElement>(
      "rect",
    ) as unknown as Selection<SVGRectElement, unknown, HTMLElement, unknown>;

    const transformSpy = vi.spyOn(zs.zoomBehavior, "transform");

    expect(() => {
      zs.updateExtents({ width: 20, height: 20 });
    }).not.toThrow();
    expect(transformSpy).not.toHaveBeenCalled();
  });
});
