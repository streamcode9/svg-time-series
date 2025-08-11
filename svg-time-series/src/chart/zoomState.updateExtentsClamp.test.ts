/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { zoomIdentity, zoomTransform } from "d3-zoom";
import type { RenderState } from "./render.ts";
import { ZoomState } from "./zoomState.ts";

interface MockZoomBehavior {
  (_s: unknown): void;
  scaleExtent: Mock;
  translateExtent: Mock;
  on: Mock;
  transform: Mock;
  triggerZoom: (transform: unknown) => void;
  _zoomHandler?: (event: unknown) => void;
}

vi.mock("d3-zoom", () => {
  interface Transform {
    k: number;
    x: number;
    y: number;
    translate(dx: number, dy: number): Transform;
    scale(k2: number): Transform;
    invertX(x: number): number;
    invertY(y: number): number;
  }
  const transforms = new Map<Element, Transform>();
  function createTransform(k = 1, x = 0, y = 0): Transform {
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
      scale(k2: number) {
        return createTransform(this.k * k2, this.x, this.y);
      },
      invertX(x: number) {
        return (x - this.x) / this.k;
      },
      invertY(y: number) {
        return (y - this.y) / this.k;
      },
    };
  }
  const zoomTransformFn = (node: Element): Transform =>
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
      behavior.on = vi
        .fn()
        .mockImplementation(
          (_event: string, handler: (event: unknown) => void) => {
            behavior._zoomHandler = handler;
            return behavior;
          },
        );
      behavior.transform = vi
        .fn()
        .mockImplementation((s: unknown, transform: Transform) => {
          const node = getNode(s);
          transforms.set(node, transform);
          behavior._zoomHandler?.({ transform });
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

describe("ZoomState.updateExtents clamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("clamps existing translation to new bounds", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const rect = select(svg).append("rect");
    const state = {
      dimensions: { width: 100, height: 100 },
      axes: { x: { axis: {}, g: {}, scale: {} }, y: [] },
      axisRenders: [],
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

    const initial = zoomIdentity.translate(-120, -80).scale(2);
    zs.zoomBehavior.transform(rect, initial);
    const transformSpy = zs.zoomBehavior.transform as unknown as Mock;
    transformSpy.mockClear();

    zs.updateExtents({ width: 50, height: 50 });

    expect(transformSpy).toHaveBeenCalledWith(
      rect,
      expect.objectContaining({ x: -50, y: -50, k: 2 }),
    );
    expect(transformSpy).toHaveBeenCalledTimes(2);
    expect(zoomTransform(rect.node()!)).toMatchObject({ x: -50, y: -50, k: 2 });
  });
});
