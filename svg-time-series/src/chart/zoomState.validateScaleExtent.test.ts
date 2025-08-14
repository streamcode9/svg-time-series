import { describe, it, expect } from "vitest";
import { ZoomState } from "./zoomState.ts";

describe("ZoomState.validateScaleExtent", () => {
  it("rejects non-array inputs", () => {
    expect(() => {
      ZoomState.validateScaleExtent(5 as unknown);
    }).toThrow(/Received: 5/);
  });

  it("rejects arrays without exactly two elements", () => {
    expect(() => {
      ZoomState.validateScaleExtent([1] as unknown);
    }).toThrow(/Received: \[1\]/);
    expect(() => {
      ZoomState.validateScaleExtent([1, 2, 3] as unknown);
    }).toThrow(/Received: \[1,2,3\]/);
  });

  it("rejects non-positive numbers", () => {
    expect(() => {
      ZoomState.validateScaleExtent([0, 2]);
    }).toThrow(/Received: \[0,2\]/);
  });

  it.each([
    [2, 1],
    [1, 1],
  ])("rejects when min >= max %j", (a, b) => {
    expect(() => {
      ZoomState.validateScaleExtent([a, b]);
    }).toThrow(new RegExp(`Received: \\[${String(a)},${String(b)}\\]`));
  });

  it("returns extent when valid", () => {
    expect(ZoomState.validateScaleExtent([1, 2])).toEqual([1, 2]);
  });
});
