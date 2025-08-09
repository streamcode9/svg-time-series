/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from "vitest";
import { select } from "d3-selection";

vi.mock("d3-zoom", () => {
  return {
    zoom: () => {
      const behavior: any = (selection: any) => {
        selection.on("wheel.zoom", (event: Event) =>
          behavior._handler?.(event as any),
        );
        selection.on("pointerdown.zoom", (event: Event) =>
          behavior._handler?.(event as any),
        );
      };
      behavior.scaleExtent = () => behavior;
      behavior.translateExtent = () => behavior;
      behavior.on = (_: string, handler: any) => {
        behavior._handler = handler;
        return behavior;
      };
      behavior.transform = vi.fn();
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
    ) as any;
    svg.width = { baseVal: { value: 10 } };
    svg.height = { baseVal: { value: 10 } };
    const rect = select(svg).append("rect");
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: [{ onZoomPan: vi.fn() }],
    };
    const refresh = vi.fn();
    const zoomCb = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh, zoomCb);

    rect.node()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(zoomCb).toHaveBeenCalled();

    zoomCb.mockClear();
    zs.destroy();
    rect.node()?.dispatchEvent(new Event("wheel", { bubbles: true }));
    rect.node()?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(zoomCb).not.toHaveBeenCalled();
  });

  it("cancels pending refresh", () => {
    vi.useFakeTimers();
    const svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as any;
    svg.width = { baseVal: { value: 10 } };
    svg.height = { baseVal: { value: 10 } };
    const rect = select(svg).append("rect");
    const state: any = {
      dimensions: { width: 10, height: 10 },
      transforms: [{ onZoomPan: vi.fn() }],
    };
    const refresh = vi.fn();
    const zs = new ZoomState(rect as any, state, refresh);

    zs.refresh();
    zs.destroy();

    vi.runAllTimers();

    expect(refresh).not.toHaveBeenCalled();
  });
});
