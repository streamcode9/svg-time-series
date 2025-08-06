/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { select } from "d3-selection";

vi.mock("d3-zoom", () => {
  const behavior: any = () => {};
  behavior.scaleExtent = () => behavior;
  behavior.translateExtent = () => behavior;
  behavior.on = () => behavior;
  behavior.transform = vi.fn();
  return { zoom: () => behavior };
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

    const event = { transform: { x: 5, k: 2 } } as any;
    zs.zoom(event);
    vi.runAllTimers();

    expect(ny.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(sf.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(refresh).toHaveBeenCalledTimes(1);
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
});
