import { describe, expect, it } from "vitest";
import { SegmentTree } from "./index";

describe("Segment Tree Tests", () => {
  it("should return the correct value for single element queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(0, 0)).toBe(1);
    expect(tree.query(7, 7)).toBe(8);
  });

  it("should return the correct sum for the full range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(0, 7)).toBe(36);
  });

  it("should handle a query that includes the last element correctly", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(4, 7)).toBe(26);
  });

  it("should return the correct sum for a subset of the range", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(1, 3)).toBe(9);
  });

  it("should correctly update a value and reflect it in the queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    tree.update(3, 10);
    expect(tree.query(0, 7)).toBe(42);
    expect(tree.query(1, 3)).toBe(15);
  });

  it("should handle an odd-sized array correctly", () => {
    const data = [1, 3, 5, 7, 9];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(0, 4)).toBe(25);
    expect(tree.query(2, 4)).toBe(21);
    expect(tree.query(1, 3)).toBe(15);
  });

  it("should handle a single-element array", () => {
    const data = [42];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(0, 0)).toBe(42);
  });

  it("should throw an error when constructed with an empty array", () => {
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    expect(() => new SegmentTree([], sumOperator, identity)).toThrow(
      "Data array must contain at least one element",
    );
  });

  it("should handle a range that includes the very last element of the array", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(tree.query(5, 7)).toBe(21);
  });

  it("should reflect updates to the last element in range queries", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    tree.update(7, 10);
    expect(tree.query(5, 7)).toBe(23);
    expect(tree.query(0, 7)).toBe(38);
  });

  it("should update a value at a valid index", () => {
    const data = [1, 2, 3];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    tree.update(1, 5);
    expect(tree.query(0, 2)).toBe(9);
  });

  it("should throw an error when updating with a negative index", () => {
    const data = [1, 2, 3];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(() => {
      tree.update(-1, 5);
    }).toThrow("Index is out of range");
  });

  it("should throw an error when updating with an index greater than or equal to the size", () => {
    const data = [1, 2, 3];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(() => {
      tree.update(3, 5);
    }).toThrow("Index is out of range");
  });

  it("should throw an error when updating with a non-integer index", () => {
    const data = [1, 2, 3];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(() => {
      tree.update(1.5, 5);
    }).toThrow("Index must be an integer");
  });

  it("should throw an error for invalid ranges", () => {
    const data = [1, 2, 3, 4, 5];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(() => tree.query(3, 2)).toThrow("Range is not valid");
    expect(() => tree.query(-1, 2)).toThrow("Index is out of range");
    expect(() => tree.query(0, 5)).toThrow("Index is out of range");
  });

  it("should throw an error when querying with non-integer indices", () => {
    const data = [1, 2, 3, 4, 5];
    const sumOperator = (a: number, b: number) => a + b;
    const identity = 0;
    const tree = new SegmentTree(data, sumOperator, identity);

    expect(() => tree.query(1.2, 3)).toThrow("Index must be an integer");
    expect(() => tree.query(1, 2.8)).toThrow("Index must be an integer");
  });

  it("should support min queries and updates", () => {
    const data = [5, 3, 8, 6, 2, 7];
    const minOperator = (a: number, b: number) => Math.min(a, b);
    const identity = Infinity;
    const tree = new SegmentTree(data, minOperator, identity);

    expect(tree.query(0, 5)).toBe(2);
    expect(tree.query(1, 3)).toBe(3);

    tree.update(4, 10);
    expect(tree.query(0, 5)).toBe(3);

    tree.update(0, 1);
    expect(tree.query(0, 5)).toBe(1);
  });

  it("should support max queries and updates", () => {
    const data = [5, 3, 8, 6, 2, 7];
    const maxOperator = (a: number, b: number) => Math.max(a, b);
    const identity = -Infinity;
    const tree = new SegmentTree(data, maxOperator, identity);

    expect(tree.query(0, 5)).toBe(8);
    expect(tree.query(1, 3)).toBe(8);

    tree.update(2, 0);
    expect(tree.query(0, 5)).toBe(7);

    tree.update(1, 9);
    expect(tree.query(0, 5)).toBe(9);
  });
});
