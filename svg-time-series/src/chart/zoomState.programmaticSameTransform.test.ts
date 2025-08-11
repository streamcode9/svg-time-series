/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

interface MockZoomBehavior {
  (_s: unknown): void;
  scaleExtent: vi.Mock;
  translateExtent: vi.Mock;
  on: vi.Mock;
  transform: vi.Mock;
  triggerZoom: (transform: unknown) => void;
  _zoomHandler?: (event: unknown) => void;
}

vi.mock("d3-zoom", () => {
  const behavior = vi.fn() as unknown as MockZoomBehavior;
  behavior.scaleExtent = vi.fn().mockReturnValue(behavior);
  behavior.translateExtent = vi.fn().mockReturnValue(behavior);
  behavior.on = vi
    .fn()
    .mockImplementation((_event: string, handler: (event: unknown) => void) => {
      behavior._zoomHandler = handler;
      return behavior;
    });
  behavior.transform = vi
    .fn<(s: unknown, transform: unknown) => void>()
    .mockImplementation((_s, transform) => {
      const clone = { ...(transform as Record<string, number>) };
      behavior._zoomHandler?.({ transform: clone });
      return behavior;
    });
  behavior.triggerZoom = (transform: unknown) => {
    const clone = { ...(transform as Record<string, number>) };
    behavior._zoomHandler?.({ transform: clone });
  };
  return { zoom: () => behavior, zoomIdentity: { k: 1, x: 0, y: 0 } };
});

describe("ZoomState programmatic transforms", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("handles identical value transforms as the same", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const y = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: {
        x: { axis: {}, g: {}, scale: {} },
        y: [{ transform: y }],
      },
      axisRenders: [],
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      refresh,
    );

    const transformSpy = zs.zoomBehavior.transform as unknown as vi.Mock;
    const initial = { x: 1, y: 2, k: 3 };
    zs.zoomBehavior.transform(rect, initial);
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    interface ZoomStateInternal {
      currentPanZoomTransformState: unknown;
    }
    expect(
      (zs as unknown as ZoomStateInternal).currentPanZoomTransformState,
    ).toBeNull();
  });
});
