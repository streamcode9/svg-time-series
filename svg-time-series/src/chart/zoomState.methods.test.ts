/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

describe("ZoomState class methods", () => {
  it("defines setScaleExtent and updateExtents on the prototype", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
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
      vi.fn(),
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(zs.setScaleExtent).toBe(ZoomState.prototype.setScaleExtent);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(zs.updateExtents).toBe(ZoomState.prototype.updateExtents);
  });
});
