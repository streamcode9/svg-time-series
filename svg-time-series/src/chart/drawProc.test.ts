/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { drawProc } from "./interaction.ts";

describe("drawProc", () => {
  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it("executes underlying function only once", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const wrapped = drawProc(fn);

    wrapped();
    wrapped();
    wrapped();

    expect(fn).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
