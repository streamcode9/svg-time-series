import { expect, test } from "vitest";
import { SegmentTree, IMinMax } from "./segmentTree.ts";

test("SegmentTree operations", () => {
  const data = [1, 3, 2, 5, 4];
  const buildTuple = (index: number, elements: readonly number[]): IMinMax => ({
    min: elements[index],
    max: elements[index],
  });

  const tree = new SegmentTree(data, data.length, buildTuple);

  // Test initial state
  expect(tree.getMinMax(0, data.length - 1)).toEqual({ min: 1, max: 5 });
  expect(tree.getMinMax(1, 3)).toEqual({ min: 2, max: 5 });

  // Test update
  tree.update(2, { min: 6, max: 6 });
  expect(tree.getMinMax(0, data.length - 1)).toEqual({ min: 1, max: 6 });
  expect(tree.getMinMax(2, data.length - 1)).toEqual({ min: 4, max: 6 });

  // Test invalid range
  expect(() => tree.getMinMax(-1, data.length - 1)).toThrow(
    "Range is not valid",
  );
  expect(() => tree.getMinMax(3, 2)).toThrow("Range is not valid");
  expect(() => tree.getMinMax(0, data.length)).toThrow("Range is not valid");

  // Test invalid update position
  expect(() => tree.update(-1, { min: 0, max: 0 })).toThrow(
    "Index is out of range",
  );
  expect(() => tree.update(5, { min: 0, max: 0 })).toThrow(
    "Index is out of range",
  );
});

test("SegmentTree with IMinMax", () => {
  const data = [
    { min: 1, max: 2 },
    { min: 3, max: 4 },
    { min: 2, max: 5 },
    { min: 5, max: 6 },
    { min: 4, max: 7 },
  ];
  const buildTuple = (index: number, elements: readonly IMinMax[]): IMinMax =>
    elements[index];

  const tree = new SegmentTree(data, data.length, buildTuple);

  // Test initial state
  expect(tree.getMinMax(0, data.length - 1)).toEqual({ min: 1, max: 7 });
  expect(tree.getMinMax(1, 3)).toEqual({ min: 2, max: 6 });

  // Test update
  tree.update(2, { min: 0, max: 8 });
  expect(tree.getMinMax(0, data.length - 1)).toEqual({ min: 0, max: 8 });
  expect(tree.getMinMax(2, data.length - 1)).toEqual({ min: 0, max: 8 });
});
