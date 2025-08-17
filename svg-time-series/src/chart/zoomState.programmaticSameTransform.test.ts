/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { ZoomTransform } from "d3-zoom";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";
import type { ZoomScheduler } from "./zoomScheduler.ts";

interface MockZoomBehavior {
  (_s: unknown): void;
  scaleExtent: Mock;
  translateExtent: Mock;
  on: Mock;
  transform: Mock;
  triggerZoom: (transform: unknown) => void;
  _zoomHandler?: (event: unknown) => void;
  constrain: Mock;
  _constrain?: (
    t: unknown,
    extent: unknown,
    translateExtent: unknown,
  ) => unknown;
}

vi.mock("d3-zoom", () => {
  const behavior = vi.fn() as unknown as MockZoomBehavior;
  behavior.scaleExtent = vi.fn().mockReturnValue(behavior);
  behavior.translateExtent = vi.fn().mockReturnValue(behavior);
  behavior.constrain = vi.fn().mockImplementation((fn?: unknown) => {
    if (fn) {
      behavior._constrain = fn as (
        t: unknown,
        extent: unknown,
        translateExtent: unknown,
      ) => unknown;
      return behavior;
    }
    return behavior._constrain;
  });
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
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
      setDimensions: vi.fn(),
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zs = new ZoomState(
      rect as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      state,
      refresh,
    );

    const transformSpy = vi.spyOn(zs.zoomBehavior, "transform");
    const initial = { x: 1, y: 2, k: 3 } as unknown as ZoomTransform;
    zs.zoomBehavior.transform(rect, initial);
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledTimes(2);
    expect(applyZoomTransform).toHaveBeenCalledWith(initial);
    expect(refresh).toHaveBeenCalledTimes(2);
    interface ZoomStateInternal {
      zoomScheduler: ZoomScheduler;
    }
    expect(
      (zs as unknown as ZoomStateInternal).zoomScheduler.getCurrentTransform(),
    ).toBeNull();
  });
});
