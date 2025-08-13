import { describe, it, expect } from "vitest";
import { SlidingWindow } from "./slidingWindow.ts";

describe("SlidingWindow", () => {
  it("throws when initial rows have different length", () => {
    expect(() => new SlidingWindow([[0, 1], [2]])).toThrow(
      /row 1 to have 2 values, received 1/,
    );
  });

  it("throws when initial data contains infinite values", () => {
    expect(
      () =>
        new SlidingWindow([
          [0, 1],
          [2, Infinity],
        ]),
    ).toThrow(/row 1 series 1.*finite number or NaN/);
  });

  it("allows NaN values", () => {
    expect(
      () =>
        new SlidingWindow([
          [0, NaN],
          [2, 3],
        ]),
    ).not.toThrow();
  });

  it("throws when appended values have different length", () => {
    const sw = new SlidingWindow([[0, 1]]);
    expect(() => {
      sw.append(1);
    }).toThrow(/requires 2 values, received 1/);
  });

  it("throws when appended values contain infinite numbers", () => {
    const sw = new SlidingWindow([[0]]);
    expect(() => {
      sw.append(Infinity);
    }).toThrow(/series 0.*finite number or NaN/);
  });
});
