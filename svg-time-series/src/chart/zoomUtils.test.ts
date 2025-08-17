import { describe, it, expect } from "vitest";
import { validateScaleExtent } from "./zoomUtils.ts";

describe("validateScaleExtent", () => {
  it("returns extent when valid", () => {
    expect(validateScaleExtent([1, 2])).toEqual([1, 2]);
  });

  it("rejects malformed extents", () => {
    expect(() => validateScaleExtent(5 as unknown)).toThrow(/Received: 5/);
    expect(() => validateScaleExtent([1] as unknown)).toThrow(
      /Received: \[1\]/,
    );
    expect(() => validateScaleExtent(["1", 2] as unknown)).toThrow(
      /Received: \[1,2\]/,
    );
  });

  it("rejects non-positive numbers", () => {
    expect(() => validateScaleExtent([0, 2])).toThrow(/Received: \[0,2\]/);
    expect(() => validateScaleExtent([-1, 2])).toThrow(/Received: \[-1,2\]/);
  });

  it("rejects inverted ranges", () => {
    expect(() => validateScaleExtent([2, 1])).toThrow(/Received: \[2,1\]/);
    expect(() => validateScaleExtent([1, 1])).toThrow(/Received: \[1,1\]/);
  });
});
