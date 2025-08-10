/**
 * @vitest-environment jsdom
 */
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
  return {
    zoom: () => {
      const behavior = vi.fn() as unknown as MockZoomBehavior;
      behavior.scaleExtent = vi.fn().mockReturnValue(behavior);
      behavior.translateExtent = vi.fn().mockReturnValue(behavior);
      behavior.on = vi
        .fn()
        .mockImplementation(
          (_event: string, handler: (event: unknown) => void) => {
            behavior._zoomHandler = handler;
            return behavior;
          },
        );
      behavior.transform = vi
        .fn<(s: unknown, transform: unknown) => void>()
        .mockImplementation((_s, transform) => {
          behavior._zoomHandler?.({ transform });
          return behavior;
        });
      behavior.triggerZoom = (transform: unknown) => {
        behavior._zoomHandler?.({ transform });
      };
      return behavior;
    },
    zoomIdentity: { k: 1, x: 0, y: 0 },
  };
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
        x: { axis: {}, g: {}, scale: {} },
        y: [{ transform: y }, { transform: y2 }],
      },
      axisRenders: [],
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

  it("forwards programmatic transform to zoom behavior", () => {
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

    expect(transformSpy).toHaveBeenCalledTimes(1);
    expect(transformSpy).toHaveBeenCalledWith(expect.anything(), {
      x: 2,
      k: 3,
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(zoomCb).toHaveBeenCalledTimes(2);
    expect(zoomCb).toHaveBeenNthCalledWith(1, event);
    const internalEvent = zoomCb.mock.calls[1][0];
    expect(internalEvent).toMatchObject({ transform: { x: 2, k: 3 } });
    expect(internalEvent.sourceEvent).toBeUndefined();
  });

  it("accumulates forwarded and user zoom events", () => {
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
    transformSpy.mockClear();

    const forwarded = {
      transform: { x: 3, k: 2 },
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(forwarded);
    vi.runAllTimers();

    const userEvent = {
      transform: { x: 5, k: 4 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs.zoom(userEvent);
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledTimes(2);
    expect(transformSpy).toHaveBeenNthCalledWith(1, expect.anything(), {
      x: 3,
      k: 2,
    });
    expect(transformSpy).toHaveBeenNthCalledWith(2, expect.anything(), {
      x: 5,
      k: 4,
    });
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("applies forwarded zoom before subsequent zoom on target chart", () => {
    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect1 = select(svg1).append("rect");
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect2 = select(svg2).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: { x: { axis: {}, g: {}, scale: {} }, y: [] },
      axisRenders: [],
    } as unknown as RenderState;
    const zs2 = new ZoomState(
      rect2 as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );
    const zs1 = new ZoomState(
      rect1 as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
      (event) => {
        const forwarded = {
          ...event,
          sourceEvent: null,
        } as D3ZoomEvent<SVGRectElement, unknown>;
        zs2.zoom(forwarded);
      },
    );

    const transformSpy = zs2.zoomBehavior.transform as unknown as vi.Mock;
    transformSpy.mockClear();

    const event1 = {
      transform: { x: 1, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs1.zoom(event1);
    const event2 = {
      transform: { x: 5, k: 4 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs2.zoom(event2);
    vi.runAllTimers();
    expect(transformSpy).toHaveBeenCalledTimes(2);
    expect(transformSpy).toHaveBeenNthCalledWith(1, expect.anything(), {
      x: 1,
      k: 2,
    });
    expect(transformSpy).toHaveBeenNthCalledWith(2, expect.anything(), {
      x: 5,
      k: 4,
    });
  });

  it("does not leave source chart stuck after target chart zoom", () => {
    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect1 = select(svg1).append("rect");
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect2 = select(svg2).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axes: { x: { axis: {}, g: {}, scale: {} }, y: [] },
      axisRenders: [],
    } as unknown as RenderState;
    // eslint-disable-next-line prefer-const
    let zs2: ZoomState;
    const zs1 = new ZoomState(
      rect1 as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
      (event) => {
        if (event.sourceEvent) {
          const forwarded = {
            ...event,
            sourceEvent: null,
          } as D3ZoomEvent<SVGRectElement, unknown>;
          zs2.zoom(forwarded);
        }
      },
    );
    zs2 = new ZoomState(
      rect2 as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
      (event) => {
        if (event.sourceEvent) {
          const forwarded = {
            ...event,
            sourceEvent: null,
          } as D3ZoomEvent<SVGRectElement, unknown>;
          zs1.zoom(forwarded);
        }
      },
    );

    const event1 = {
      transform: { x: 1, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs1.zoom(event1);

    const event2 = {
      transform: { x: 5, k: 4 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs2.zoom(event2);

    vi.runAllTimers();

    expect(
      (zs1 as unknown as { pendingZoomBehaviorTransform: boolean })
        .pendingZoomBehaviorTransform,
    ).toBe(false);
    expect(
      (zs1 as unknown as { currentPanZoomTransformState: unknown })
        .currentPanZoomTransformState,
    ).toBeNull();
  });

  it("programmatic zoom does not reapply transform on subsequent refresh", () => {
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

    zs.zoom({
      transform: { x: 4, k: 5 },
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>);
    vi.runAllTimers();

    transformSpy.mockClear();
    refresh.mockClear();

    zs.refresh();
    vi.runAllTimers();

    expect(transformSpy).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("refresh triggers refresh callback without reapplying transform", () => {
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
    ).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("updates zoom extents on resize", () => {
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

    expect(rect.attr("width")).toBe("20");
    expect(rect.attr("height")).toBe("30");
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
        x: { axis: {}, g: {}, scale: {} },
        y: [{ transform: y }],
      },
      axisRenders: [],
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
      axisRenders: [],
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

  it.each([
    [1, 10],
    [0.5, 20],
  ])("accepts valid scale extent %j", (min, max) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
    } as unknown as RenderState;
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );

    expect(() => zs.setScaleExtent([min, max])).not.toThrow();
  });

  it.each([
    [0, 10],
    [-1, 10],
    [1, 1],
    [5, 3],
    [1, 0],
    [1, -5],
    [Infinity, 10],
    [NaN, 10],
    [1, Infinity],
    [1, NaN],
  ])("rejects invalid scale extent %j", (min, max) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
    } as unknown as RenderState;
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );

    expect(() => zs.setScaleExtent([min, max])).toThrow(
      /scaleExtent must be two finite, positive numbers/,
    );
  });

  it("rejects scale extents that do not contain exactly two values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
    } as unknown as RenderState;
    const zs = new ZoomState(
      rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      state,
      vi.fn(),
    );

    expect(() => zs.setScaleExtent([1] as unknown as [number, number])).toThrow(
      /scaleExtent must be two finite, positive numbers/,
    );
    expect(() =>
      zs.setScaleExtent([1, 2, 3] as unknown as [number, number]),
    ).toThrow(/scaleExtent must be two finite, positive numbers/);
  });

  it.each([
    [0, 10],
    [-1, 10],
    [1, 1],
    [5, 3],
    [1, 0],
    [1, -5],
    [Infinity, 10],
    [NaN, 10],
    [1, Infinity],
    [1, NaN],
  ])("rejects invalid constructor scale extent %j", (min, max) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
    } as unknown as RenderState;

    expect(
      () =>
        new ZoomState(
          rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [min, max] },
        ),
    ).toThrow(/scaleExtent must be two finite, positive numbers/);
  });

  it("rejects constructor scale extents without exactly two values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
    } as unknown as RenderState;

    expect(
      () =>
        new ZoomState(
          rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [1] as unknown as [number, number] },
        ),
    ).toThrow(/scaleExtent must be two finite, positive numbers/);
    expect(
      () =>
        new ZoomState(
          rect as Selection<SVGRectElement, unknown, HTMLElement, unknown>,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [1, 2, 3] as unknown as [number, number] },
        ),
    ).toThrow(/scaleExtent must be two finite, positive numbers/);
  });
});
