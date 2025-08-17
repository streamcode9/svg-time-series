/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type { RenderState } from "./render.ts";

interface MockZoomBehavior {
  (selection: Selection<Element, unknown, Element, unknown>): void;
  _handler?: (event: unknown) => void;
  scaleExtent: () => MockZoomBehavior;
  translateExtent: () => MockZoomBehavior;
  on: (_: string, handler: (event: unknown) => void) => MockZoomBehavior;
  transform: ReturnType<typeof vi.fn>;
  scaleTo: ReturnType<typeof vi.fn>;
}

vi.mock("d3-zoom", () => {
  return {
    zoom: () => {
      const behavior: MockZoomBehavior = (
        selection: Selection<Element, unknown, Element, unknown>,
      ) => {
        selection.on("wheel.zoom", (event: Event) =>
          behavior._handler?.({
            transform: { x: 0, k: 1 },
            sourceEvent: event,
          }),
        );
        selection.on("pointerdown.zoom", (event: Event) =>
          behavior._handler?.({
            transform: { x: 0, k: 1 },
            sourceEvent: event,
          }),
        );
      };
      behavior.scaleExtent = () => behavior;
      behavior.translateExtent = () => behavior;
      behavior.on = (_: string, handler: (event: unknown) => void) => {
        behavior._handler = handler;
        return behavior;
      };
      behavior.transform = vi.fn();
      behavior.scaleTo = vi.fn();
      return behavior;
    },
  };
});

import { ZoomState } from "./zoomState.ts";

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe("ZoomState.destroy", () => {
  it("removes wheel and pointer handlers", () => {
    vi.useFakeTimers();
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement & {
      width: { baseVal: { value: number } };
      height: { baseVal: { value: number } };
    };
    svg.width = { baseVal: { value: 10 } } as unknown as SVGAnimatedLength;
    svg.height = { baseVal: { value: 10 } } as unknown as SVGAnimatedLength;
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
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

    rect.node()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    vi.runAllTimers();
    expect(zoomCb).toHaveBeenCalled();

    zoomCb.mockClear();
    zs.destroy();
    rect.node()?.dispatchEvent(new Event("wheel", { bubbles: true }));
    rect.node()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    vi.runAllTimers();
    expect(zoomCb).not.toHaveBeenCalled();
  });

  it("cancels pending refresh", () => {
    vi.useFakeTimers();
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as SVGSVGElement & {
      width: { baseVal: { value: number } };
      height: { baseVal: { value: number } };
    };
    svg.width = { baseVal: { value: 10 } } as unknown as SVGAnimatedLength;
    svg.height = { baseVal: { value: 10 } } as unknown as SVGAnimatedLength;
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
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

    zs.refresh();
    zs.destroy();

    vi.runAllTimers();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("setScaleExtent and updateExtents no-op after destroy", () => {
    vi.useFakeTimers();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 10, height: 10 },
      axisRenders: [],
      applyZoomTransform: vi.fn(),
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

    const scaleToSpy = vi.spyOn(zs.zoomBehavior, "scaleTo");
    const transformSpy = vi.spyOn(zs.zoomBehavior, "transform");

    zs.destroy();

    expect(() => {
      zs.setScaleExtent([1, 2]);
    }).not.toThrow();
    expect(scaleToSpy).not.toHaveBeenCalled();

    expect(() => {
      zs.updateExtents({ width: 20, height: 20 });
    }).not.toThrow();
    expect(transformSpy).not.toHaveBeenCalled();
  });
});
