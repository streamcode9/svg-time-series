import { describe, it, expect } from "vitest";
import { extent } from "d3-array";
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

describe("Math.min/Math.max replacement for extent", () => {
  const cases: Array<[string, number, number]> = [
    ["normal inputs", 2, 10],
    ["equal inputs", 5, 5],
    ["non-finite inputs", Number.NaN, Number.POSITIVE_INFINITY],
  ];

  const oldRange = (min: number, max: number): [number, number] => {
    let [y0, y1] = extent([min, max]) as [
      number | undefined,
      number | undefined,
    ];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
      y0 = 0;
      y1 = 1;
    } else if (y0 === y1) {
      const epsilon = 0.5;
      y0 = (y0 as number) - epsilon;
      y1 = (y1 as number) + epsilon;
    }
    return [y0!, y1!];
  };

  const newRange = (min: number, max: number): [number, number] => {
    let y0 = Math.min(min, max);
    let y1 = Math.max(min, max);
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
      y0 = 0;
      y1 = 1;
    } else if (y0 === y1) {
      const epsilon = 0.5;
      y0 -= epsilon;
      y1 += epsilon;
    }
    return [y0, y1];
  };

  it.each(cases)("matches extent for %s", (_name, min, max) => {
    expect(newRange(min, max)).toEqual(oldRange(min, max));
  });
});
