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
    const y = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const y2 = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: {
        x: { axis: {} as any, g: {} as any, scale: {} as any },
        y: [{ transform: y } as any, { transform: y2 } as any],
      },
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      refresh,
      zoomCb,
    );

    const event = {
      transform: { x: 5, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(event);
    vi.runAllTimers();

    expect(y.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(y2.onZoomPan).toHaveBeenCalledWith({ x: 5, k: 2 });
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
    const y = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: {
        x: { axis: {} as any, g: {} as any, scale: {} as any },
        y: [{ transform: y } as any],
      },
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      refresh,
      zoomCb,
    );

    const transformSpy = zs.zoomBehavior.transform as unknown as vi.Mock;
    transformSpy.mockClear();
    const event = {
      transform: { x: 2, k: 3 },
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(event);
    vi.runAllTimers();

    expect(transformSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledWith(event);
  });

  it("refresh triggers refresh callback without reapplying transform", () => {
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

    zs.zoom({
      transform: { x: 1, k: 1 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>);
    vi.runAllTimers();

    const transformSpy = zs.zoomBehavior.transform as unknown as vi.Mock;
    transformSpy.mockClear();
    refresh.mockClear();

    zs.refresh();
    vi.runAllTimers();

    expect(transformSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reset sets transform to identity and triggers zoom event", () => {
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
    transformSpy.mockClear();
    y.onZoomPan.mockClear();
    refresh.mockClear();

    zs.reset();
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledWith(
      rect,
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    expect(y.onZoomPan).toHaveBeenCalledWith(
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    expect(
      (zs as unknown as { currentPanZoomTransformState: unknown })
        .currentPanZoomTransformState,
    ).toEqual(expect.objectContaining({ k: 1, x: 0, y: 0 }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("updates zoom extents on resize", () => {
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
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: vi.Mock })
      .scaleExtent;
    const translateSpy = (
      zs.zoomBehavior as unknown as { translateExtent: vi.Mock }
    ).translateExtent;

    scaleSpy.mockClear();
    translateSpy.mockClear();

    zs.updateExtents({ width: 20, height: 30 });

    expect(scaleSpy).toHaveBeenCalledWith([1, 40]);
    expect(translateSpy).toHaveBeenCalledWith([
      [0, 0],
      [20, 30],
    ]);
  });

  it("uses provided scale extents", () => {
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
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
      undefined,
      {
        scaleExtent: [0.5, 20],
      },
    );

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: vi.Mock })
      .scaleExtent;
    expect(scaleSpy).toHaveBeenCalledWith([0.5, 20]);

    scaleSpy.mockClear();

    zs.updateExtents({ width: 15, height: 25 });

    expect(scaleSpy).toHaveBeenCalledWith([0.5, 20]);
  });

  it("updates scale extent at runtime", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const y = { onZoomPan: vi.fn<(t: unknown) => void>() };
    const state = {
      dimensions: { width: 10, height: 10 },
      transforms: [y],
    } as unknown as RenderState;
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: vi.Mock })
      .scaleExtent;
    scaleSpy.mockClear();

    zs.setScaleExtent([2, 80]);
    expect(scaleSpy).toHaveBeenCalledWith([2, 80]);

    scaleSpy.mockClear();
    zs.updateExtents({ width: 20, height: 30 });
    expect(scaleSpy).toHaveBeenCalledWith([2, 80]);
  });
});
