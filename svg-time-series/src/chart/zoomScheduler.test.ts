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

  it("handles direct user events", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, {})).toBe(true);
    expect(zs.isPending()).toBe(true);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledWith({ x: 1, k: 2 });
  });

  it("starts programmatic transforms", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, null)).toBe(
      true,
    );
    expect(zs.isPending()).toBe(true);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledWith({ x: 1, k: 2 });
  });

  it("rejects conflicting programmatic transforms", () => {
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

  it("finalizes transform after confirmation", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);
    const t = { x: 1, k: 2 } as unknown as ZoomTransform;

    expect(zs.zoom(t, null)).toBe(true);
    vi.runAllTimers();
    expect(apply).toHaveBeenCalledWith({ x: 1, k: 2 });
    expect(zs.isPending()).toBe(true);

    expect(zs.zoom(t, null)).toBe(true);
    expect(zs.isPending()).toBe(false);
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

  it("does not invoke callbacks after destroy", () => {
    const apply = vi.fn();
    const refresh = vi.fn();
    const cb = vi.fn();
    const zs = new ZoomScheduler(apply, refresh);

    expect(
      zs.zoom({ x: 1, k: 2 } as unknown as ZoomTransform, {}, undefined, cb),
    ).toBe(true);

    zs.destroy();
    vi.runAllTimers();
    expect(cb).not.toHaveBeenCalled();

    expect(zs.zoom({ x: 5, k: 3 } as unknown as ZoomTransform, {})).toBe(true);
    vi.runAllTimers();
    expect(cb).not.toHaveBeenCalled();
  });
});
