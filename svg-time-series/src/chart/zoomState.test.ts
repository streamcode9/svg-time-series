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
import { zoomTransform, type ZoomTransform } from "d3-zoom";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";
import type { D3ZoomEvent } from "./zoomState.ts";
import type { ZoomScheduler } from "./zoomScheduler.ts";

interface MockZoomBehavior {
  (_s: unknown): void;
  scaleExtent: Mock;
  translateExtent: Mock;
  on: Mock;
  transform: Mock;
  scaleTo: Mock;
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
  const transforms = new Map<Element, ReturnType<typeof createTransform>>();
  function createTransform(k = 1, x = 0, y = 0) {
    return {
      k,
      x,
      y,
      translate(dx: number, dy: number) {
        return createTransform(
          this.k,
          this.x + this.k * dx,
          this.y + this.k * dy,
        );
      },
      invertX(x: number) {
        return (x - this.x) / this.k;
      },
      invertY(y: number) {
        return (y - this.y) / this.k;
      },
    };
  }
  const zoomTransformFn = (node: Element) =>
    transforms.get(node) || createTransform();
  const getNode = (s: unknown): Element =>
    typeof (s as Selection<Element, unknown, HTMLElement, unknown>).node ===
    "function"
      ? ((
          s as Selection<Element, unknown, HTMLElement, unknown>
        ).node() as Element)
      : (s as Element);
  return {
    zoom: () => {
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
        .mockImplementation(
          (_event: string, handler: (event: unknown) => void) => {
            behavior._zoomHandler = handler;
            return behavior;
          },
        );
      behavior.transform = vi
        .fn<(s: unknown, transform: unknown) => void>()
        .mockImplementation((s, transform) => {
          const node = getNode(s);
          transforms.set(node, transform as ReturnType<typeof createTransform>);
          behavior._zoomHandler?.({ transform });
          return behavior;
        });
      behavior.scaleTo = vi
        .fn<(s: unknown, k: number) => void>()
        .mockImplementation((s, k) => {
          const node = getNode(s);
          const current = zoomTransformFn(node);
          const newTransform = { ...current, k };
          transforms.set(node, newTransform);
          behavior._zoomHandler?.({ transform: newTransform });
          return behavior;
        });
      behavior.triggerZoom = (transform: unknown) => {
        behavior._zoomHandler?.({ transform });
      };
      return behavior;
    },
    zoomIdentity: createTransform(),
    zoomTransform: zoomTransformFn,
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
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
      setDimensions: vi.fn(),
    } as unknown as RenderState;
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(
      rect as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
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

    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 5, k: 2 });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(zoomCb).toHaveBeenCalledTimes(1);
    const internalEvent = zoomCb.mock.calls.at(0)![0] as {
      transform: { x: number; k: number };
      sourceEvent?: unknown;
    };
    expect(internalEvent).toMatchObject({ transform: { x: 5, k: 2 } });
    expect(internalEvent.sourceEvent).toBeUndefined();
  });

  it("forwards programmatic transform to zoom behavior", () => {
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
    const zoomCb = vi.fn();
    const zs = new ZoomState(
      rect as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      state,
      refresh,
      zoomCb,
    );

    const transformSpy = vi.spyOn(zs.zoomBehavior, "transform");
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
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 2, k: 3 });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(zoomCb).toHaveBeenCalledTimes(1);
    const internalEvent = zoomCb.mock.calls.at(0)![0] as {
      transform: { x: number; k: number };
      sourceEvent?: unknown;
    };
    expect(internalEvent).toMatchObject({ transform: { x: 2, k: 3 } });
    expect(internalEvent.sourceEvent).toBeUndefined();
  });

  it("coalesces rapid pan/zoom events into a single callback per frame", () => {
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
    const zoomCb = vi.fn();
    const zs = new ZoomState(
      rect as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      state,
      refresh,
      zoomCb,
    );

    const event1 = {
      transform: { x: 1, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    const event2 = {
      transform: { x: 2, k: 3 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;

    zs.zoom(event1);
    zs.zoom(event2);
    vi.runAllTimers();

    expect(applyZoomTransform).toHaveBeenCalledTimes(3);
    expect(applyZoomTransform).toHaveBeenLastCalledWith({ x: 2, k: 3 });
    expect(refresh).toHaveBeenCalledTimes(2);
    expect(zoomCb).toHaveBeenCalledTimes(1);
    const cbEvent = zoomCb.mock.calls[0]![0] as {
      transform: { x: number; k: number };
    };
    expect(cbEvent.transform).toMatchObject({ x: 2, k: 3 });
  });

  it("accumulates forwarded and user zoom events", () => {
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
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 3, k: 2 });
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 5, k: 4 });
    expect(refresh).toHaveBeenCalledTimes(4);
  });

  it("applies forwarded zoom before subsequent zoom on target chart", () => {
    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect1 = select(svg1).append("rect");
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect2 = select(svg2).append("rect");
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
      setDimensions: vi.fn(),
    } as unknown as RenderState;
    const zs2 = new ZoomState(
      rect2 as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      state,
      vi.fn(),
    );
    const zs1 = new ZoomState(
      rect1 as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
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

    const transformSpy = vi.spyOn(zs2.zoomBehavior, "transform");
    transformSpy.mockClear();

    const event1 = {
      transform: { x: 1, k: 2 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>;
    zs1.zoom(event1);
    vi.runAllTimers();
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
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 1, k: 2 });
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 5, k: 4 });
  });

  it("does not leave source chart stuck after target chart zoom", () => {
    const svg1 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect1 = select(svg1).append("rect");
    const svg2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect2 = select(svg2).append("rect");
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
      setDimensions: vi.fn(),
    } as unknown as RenderState;
    const createZoomState = (
      rect: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
      forward: () => ZoomState,
    ) =>
      new ZoomState(rect, state, vi.fn(), (event) => {
        if (event.sourceEvent) {
          const forwarded = {
            ...event,
            sourceEvent: null,
          } as D3ZoomEvent<SVGRectElement, unknown>;
          forward().zoom(forwarded);
        }
      });

    const zs1 = createZoomState(
      rect1 as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      () => zs2,
    );
    const zs2 = createZoomState(
      rect2 as unknown as Selection<
        SVGRectElement,
        unknown,
        HTMLElement,
        unknown
      >,
      () => zs1,
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

    interface ZoomStateInternal {
      zoomScheduler: ZoomScheduler;
    }
    const zs1Internal = zs1 as unknown as ZoomStateInternal;
    expect(zs1Internal.zoomScheduler.isPending()).toBe(false);
    expect(zs1Internal.zoomScheduler.getCurrentTransform()).toBeNull();
    expect(applyZoomTransform).toHaveBeenCalled();
  });

  it("programmatic zoom does not reapply transform on subsequent refresh", () => {
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

    zs.zoom({
      transform: { x: 4, k: 5 },
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>);
    vi.runAllTimers();
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 4, k: 5 });

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

    zs.zoom({
      transform: { x: 1, k: 1 },
      sourceEvent: {},
    } as unknown as D3ZoomEvent<SVGRectElement, unknown>);
    vi.runAllTimers();
    expect(applyZoomTransform).toHaveBeenCalledWith({ x: 1, k: 1 });

    const transformSpy = vi.spyOn(zs.zoomBehavior, "transform");
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
    transformSpy.mockClear();
    applyZoomTransform.mockClear();
    refresh.mockClear();

    zs.reset();
    vi.runAllTimers();

    expect(transformSpy).toHaveBeenCalledWith(
      rect,
      expect.objectContaining({ k: 1, x: 0, y: 0 }),
    );
    const identity = expect.objectContaining({ k: 1, x: 0, y: 0 }) as unknown;
    expect(applyZoomTransform).toHaveBeenCalledWith(identity);
    interface ZoomStateInternal {
      zoomScheduler: ZoomScheduler;
    }
    expect(
      (zs as unknown as ZoomStateInternal).zoomScheduler.getCurrentTransform(),
    ).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("updates zoom extents on resize", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const setDimensions = vi.fn();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
      setDimensions,
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

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: Mock })
      .scaleExtent;
    const translateSpy = (
      zs.zoomBehavior as unknown as { translateExtent: Mock }
    ).translateExtent;

    scaleSpy.mockClear();
    translateSpy.mockClear();

    zs.updateExtents({ width: 20, height: 30 });

    expect(setDimensions).not.toHaveBeenCalled();
    expect(scaleSpy).toHaveBeenCalledWith([1, 40]);
    expect(translateSpy).toHaveBeenCalledWith([
      [0, 0],
      [20, 30],
    ]);
  });

  it("uses provided scale extents", () => {
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
      undefined,
      {
        scaleExtent: [0.5, 20],
      },
    );

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: Mock })
      .scaleExtent;
    expect(scaleSpy).toHaveBeenCalledWith([0.5, 20]);

    scaleSpy.mockClear();

    zs.updateExtents({ width: 15, height: 25 });

    expect(scaleSpy).toHaveBeenCalledWith([0.5, 20]);
  });

  it("updates scale extent at runtime", () => {
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

    const scaleSpy = (zs.zoomBehavior as unknown as { scaleExtent: Mock })
      .scaleExtent;
    scaleSpy.mockClear();

    zs.setScaleExtent([2, 80]);
    expect(scaleSpy).toHaveBeenCalledWith([2, 80]);

    scaleSpy.mockClear();
    zs.updateExtents({ width: 20, height: 30 });
    expect(scaleSpy).toHaveBeenCalledWith([2, 80]);
  });

  it("clamps existing transform to new scale extent", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
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

    zs.zoomBehavior.transform(rect, {
      k: 10,
      x: 0,
      y: 0,
    } as unknown as ZoomTransform);
    expect(applyZoomTransform).toHaveBeenCalledWith({ k: 10, x: 0, y: 0 });
    const scaleSpy = vi.spyOn(zs.zoomBehavior, "scaleTo");
    scaleSpy.mockClear();

    zs.setScaleExtent([1, 5]);

    expect(scaleSpy).toHaveBeenCalledWith(rect, 5);
    expect(zoomTransform(rect.node()!)).toMatchObject({ k: 5 });
  });

  it("clamps existing transform to new minimum", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const applyZoomTransform = vi.fn<(t: unknown) => void>();
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform,
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

    zs.zoomBehavior.transform(rect, {
      k: 0.2,
      x: 0,
      y: 0,
    } as unknown as ZoomTransform);
    expect(applyZoomTransform).toHaveBeenCalledWith({ k: 0.2, x: 0, y: 0 });
    const scaleSpy = vi.spyOn(zs.zoomBehavior, "scaleTo");
    scaleSpy.mockClear();

    zs.setScaleExtent([0.5, 5]);

    expect(scaleSpy).toHaveBeenCalledWith(rect, 0.5);
    expect(zoomTransform(rect.node()!)).toMatchObject({ k: 0.5 });
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

    expect(() => {
      zs.setScaleExtent([min, max]);
    }).not.toThrow();
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

    expect(() => {
      zs.setScaleExtent([min, max]);
    }).toThrow(new RegExp(`Received: \\[${String(min)},${String(max)}\\]`));
  });

  it("rejects scale extents that do not contain exactly two values", () => {
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

    expect(() => {
      zs.setScaleExtent([1] as unknown as [number, number]);
    }).toThrow(/Received: \[1\]/);
    expect(() => {
      zs.setScaleExtent([1, 2, 3] as unknown as [number, number]);
    }).toThrow(/Received: \[1,2,3\]/);
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
      applyZoomTransform: vi.fn(),
      setDimensions: vi.fn(),
    } as unknown as RenderState;

    expect(
      () =>
        new ZoomState(
          rect as unknown as Selection<
            SVGRectElement,
            unknown,
            HTMLElement,
            unknown
          >,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [min, max] },
        ),
    ).toThrow(new RegExp(`Received: \\[${String(min)},${String(max)}\\]`));
  });

  it("rejects constructor scale extents without exactly two values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
      setDimensions: vi.fn(),
    } as unknown as RenderState;

    expect(
      () =>
        new ZoomState(
          rect as unknown as Selection<
            SVGRectElement,
            unknown,
            HTMLElement,
            unknown
          >,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [1] as unknown as [number, number] },
        ),
    ).toThrow(/Received: \[1\]/);
    expect(
      () =>
        new ZoomState(
          rect as unknown as Selection<
            SVGRectElement,
            unknown,
            HTMLElement,
            unknown
          >,
          state,
          vi.fn(),
          undefined,
          { scaleExtent: [1, 2, 3] as unknown as [number, number] },
        ),
    ).toThrow(/Received: \[1,2,3\]/);
  });
});
