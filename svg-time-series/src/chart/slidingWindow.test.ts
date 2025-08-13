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

  it("throws when appended values contain non-finite numbers", () => {
    const sw = new SlidingWindow([[0]]);
    expect(() => {
      sw.append(Infinity);
    }).toThrow(/series 0.*finite number or NaN/);
    expect(() => {
      sw.append(-Infinity);
    }).toThrow(/series 0.*finite number or NaN/);
  });

  it("shifts data and increments startIndex on append", () => {
    const sw = new SlidingWindow([
      [0, 1],
      [2, 3],
    ]);
    sw.append(4, 5);
    expect(sw.data).toEqual([
      [2, 3],
      [4, 5],
    ]);
    expect(sw.startIndex).toBe(1);

    sw.append(6, 7);
    expect(sw.data).toEqual([
      [4, 5],
      [6, 7],
    ]);
    expect(sw.startIndex).toBe(2);
  });

  it("reports constant length after multiple appends", () => {
    const sw = new SlidingWindow([[0], [1], [2]]);
    expect(sw.length).toBe(3);
    sw.append(3);
    sw.append(4);
    sw.append(5);
    expect(sw.length).toBe(3);
  });
});
