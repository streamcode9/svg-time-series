/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { select } from "d3-selection";

vi.mock("d3-zoom", () => {
  const behavior: any = () => {};
  behavior.scaleExtent = () => behavior;
  behavior.translateExtent = () => behavior;
  behavior.on = (event: string, handler: any) => {
    behavior._zoomHandler = handler;
    return behavior;
  };
  behavior.transform = vi.fn((_s: any, transform: any) => {
    behavior._zoomHandler?.({ transform });
    return behavior;
  });
  behavior.triggerZoom = (transform: any) => {
    if (behavior._zoomHandler) {
      behavior._zoomHandler({ transform });
    }
  };
  return { zoom: () => behavior, zoomIdentity: { k: 1, x: 0, y: 0 } };
});

import { ZoomState } from "./zoomState.ts";

describe("ZoomState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("updates transforms and triggers refresh on zoom", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const ny = { onZoomPan: vi.fn() };
    const sf = { onZoomPan: vi.fn() };
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: { ny, sf },
    };
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh, zoomCb);

    const event = { transform: { x: 5, k: 2 }, sourceEvent: {} } as any;
    zs.zoom(event);
    vi.runAllTimers();

    expect(ny.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(sf.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledTimes(2);
    expect(zoomCb).toHaveBeenNthCalledWith(1, event);
    const internalEvent = zoomCb.mock.calls[1][0];
    expect(internalEvent).toMatchObject({ transform: { x: 5, k: 2 } });
    expect(internalEvent.sourceEvent).toBeUndefined();
  });

  it("does not reschedule for programmatic transform", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const ny = { onZoomPan: vi.fn() };
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: { ny },
    };
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh, zoomCb);

    const transformSpy = zs.zoomBehavior.transform as any;
    transformSpy.mockClear();
    const event = { transform: { x: 2, k: 3 } } as any;
    zs.zoom(event);
    vi.runAllTimers();

    expect(transformSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledWith(event);
  });

  it("refresh re-applies transform and triggers refresh callback", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const ny = { onZoomPan: vi.fn() };
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: { ny },
    };
    const refresh = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh);

    zs.zoom({ transform: { x: 1, k: 1 } } as any);
    vi.runAllTimers();

    const transformSpy = zs.zoomBehavior.transform as any;
    transformSpy.mockClear();
    refresh.mockClear();

    zs.refresh();
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reset sets transform to identity and triggers zoom event", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const ny = { onZoomPan: vi.fn() };
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: { ny },
    };
    const refresh = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh);

    const transformSpy = zs.zoomBehavior.transform as any;
    transformSpy.mockClear();
    ny.onZoomPan.mockClear();
    refresh.mockClear();

    zs.reset();
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledWith(
      rect,
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    expect(ny.onZoomPan).toHaveBeenCalledWith(
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    expect((zs as any).currentPanZoomTransformState).toEqual(
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
