/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { drawProc } from "../utils/drawProc.ts";

describe("drawProc", () => {
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("executes underlying function only once", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { wrapped } = drawProc(fn);

    wrapped();
    wrapped();
    wrapped();

    expect(fn).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("uses latest parameters when called multiple times", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { wrapped } = drawProc(fn);

    wrapped("first");
    wrapped("second");
    wrapped("third");

    expect(fn).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("cancels scheduled execution", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { wrapped, cancel } = drawProc(fn);

    wrapped();
    cancel();

    vi.runAllTimers();

    expect(fn).not.toHaveBeenCalled();
  });
});
