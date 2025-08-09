/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { select, Selection } from "d3-selection";
import type { RenderState } from "./render.ts";
import { ZoomState, type D3ZoomEvent } from "./zoomState.ts";

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
      behavior._zoomHandler?.({ transform });
      return behavior;
    });
  behavior.triggerZoom = (transform: unknown) => {
    behavior._zoomHandler?.({ transform });
  };
  return { zoom: () => behavior, zoomIdentity: { k: 1, x: 0, y: 0 } };
});

describe("ZoomState transform state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("clears transform after application to avoid reapplying stale values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const y = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: {
        x: { axis: {} as any, g: {} as any, scale: {} as any },
        y: [{ transform: y } as any],
      },
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      refresh,
    );

    const transformSpy = zs.zoomBehavior.transform as unknown as vi.Mock;

    const first = {
      transform: { x: 1, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(first);
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledWith(rect, { x: 1, k: 2 });
    expect((zs as any).currentPanZoomTransformState).toBeNull();

    transformSpy.mockClear();
    refresh.mockClear();

    zs.refresh();
    vi.runAllTimers();

    expect(transformSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);

    transformSpy.mockClear();
    refresh.mockClear();

    const second = {
      transform: { x: 5, k: 3 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(second);
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledTimes(1);
    expect(transformSpy).toHaveBeenCalledWith(rect, { x: 5, k: 3 });
  });
});
