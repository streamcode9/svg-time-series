import { describe, it, expect } from "vitest";
import { SegmentTree } from "./index";

interface Range {
  min: number;
  max: number;
}

const combine = (a: Range, b: Range): Range => ({
  min: Math.min(a.min, b.min),
  max: Math.max(a.max, b.max),
});

const identity: Range = { min: Infinity, max: -Infinity };

describe("SegmentTree with custom objects", () => {
  it("supports querying and updating IMinMax ranges", () => {
    const data: Range[] = [
      { min: 1, max: 2 },
      { min: 3, max: 4 },
      { min: 2, max: 5 },
      { min: 5, max: 6 },
      { min: 4, max: 7 },
    ];
    const tree = new SegmentTree(data, combine, identity);

    expect(tree.query(0, data.length - 1)).toEqual({ min: 1, max: 7 });
    expect(tree.query(1, 3)).toEqual({ min: 2, max: 6 });

    tree.update(2, { min: 0, max: 8 });
    expect(tree.query(0, data.length - 1)).toEqual({ min: 0, max: 8 });
    expect(tree.query(2, data.length - 1)).toEqual({ min: 0, max: 8 });
  });
});
