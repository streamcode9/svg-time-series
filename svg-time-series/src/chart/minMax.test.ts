import { describe, it, expect } from "vitest";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";

describe("buildMinMax", () => {
  it("combines two ranges including negative values", () => {
    const range1 = { min: -5, max: 3 } as const;
    const range2 = { min: -2, max: 10 } as const;
    expect(buildMinMax(range1, range2)).toEqual({ min: -5, max: 10 });
  });

  it("treats minMaxIdentity as a neutral element", () => {
    const range = { min: -4, max: 7 } as const;
    expect(buildMinMax(range, minMaxIdentity)).toEqual(range);
    expect(buildMinMax(minMaxIdentity, range)).toEqual(range);
  });
});
