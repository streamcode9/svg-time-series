/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ZoomTransform } from "d3-zoom";
import { ZoomScheduler } from "./zoomScheduler.ts";

describe("ZoomScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("applies pending transform and clears state", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, {})).toBe(true);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledWith({ x: 1, k: 2 });
    expect(zs.getCurrentTransform()).toBeNull();

    zs.refresh();
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("ignores unexpected transform while pending", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, null)).toBe(
      true,
    );
    expect(zs.zoom({ x: 5, k: 3 } as unknown as ZoomTransform, null)).toBe(
      false,
    );
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("clears state on destroy and supports subsequent zooms", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, {})).toBe(true);
    expect(zs.getCurrentTransform()).toEqual({ x: 1, k: 2 });
    expect(zs.isPending()).toBe(true);

    zs.destroy();
    expect(zs.getCurrentTransform()).toBeNull();
    expect(zs.isPending()).toBe(false);

    vi.runAllTimers();
    expect(apply).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();

    expect(zs.zoom({ x: 5, k: 3 } as unknown as ZoomTransform, {})).toBe(true);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledWith({ x: 5, k: 3 });
  });
});
