import { describe, expect, it } from "vitest";
import { SegmentTreeHalf } from "./segmentTreeHalf";

describe("Segment Tree (Foo) Tests", () => {
  it("should return the correct value for single element queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(0, 0)).toBe(1); // First element
    expect(tree.query(7, 7)).toBe(8); // Last element
  });

  it("should return the correct sum for the full range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(0, 7)).toBe(36); // Sum of all elements
  });

  it("should handle a query that includes the last element correctly", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(4, 7)).toBe(26); // 5 + 6 + 7 + 8 = 26
  });

  it("should return the correct sum for a subset of the range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(1, 3)).toBe(9); // 2 + 3 + 4 = 9
  });

  it("should correctly update a value and reflect it in the queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    tree.update(3, 10); // Update value at index 3 (4 -> 10)
    expect(tree.query(0, 7)).toBe(42); // Sum should now be 42
    expect(tree.query(1, 3)).toBe(15); // 2 + 3 + 10 = 15
  });
  it("should handle an odd-sized array correctly", () => {
    const data = [1, 3, 5, 7, 9];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(0, 4)).toBe(25); // Sum of all elements: 1 + 3 + 5 + 7 + 9 = 25
    expect(tree.query(2, 4)).toBe(21); // Sum of last 3 elements: 5 + 7 + 9 = 21
    expect(tree.query(1, 3)).toBe(15); // Sum of middle elements: 3 + 5 + 7 = 15
  });

  it("should handle a single-element array", () => {
    const data = [42];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(0, 0)).toBe(42); // Querying the only element
  });

  it("should handle a range that includes the very last element of the array", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(tree.query(5, 7)).toBe(21); // 6 + 7 + 8 = 21
  });

  it("should reflect updates to the last element in range queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    tree.update(7, 10); // Update the last element (8 -> 10)
    expect(tree.query(5, 7)).toBe(23); // 6 + 7 + 10 = 23
    expect(tree.query(0, 7)).toBe(38); // Sum of all elements with updated last element
  });

  it("should throw an error for invalid ranges", () => {
    const data = [1, 2, 3, 4, 5];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTreeHalf(data, sumOperator, identity);

    expect(() => tree.query(3, 2)).toThrow("Range is not valid");
    expect(() => tree.query(-1, 2)).toThrow("Range is not valid");
    expect(() => tree.query(0, 5)).toThrow("Range is not valid");
  });
});
