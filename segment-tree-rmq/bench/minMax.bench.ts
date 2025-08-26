import { bench, describe } from "vitest";
import { SegmentTree } from "../src/index.ts";

// Deterministic seed for reproducible benchmarks
const SEED = 123456789;
let seed = SEED;
const random = (): number => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0xffffffff;
};

describe("Min/max calculation", () => {
  const size = 50_000;
  const data = Array.from({ length: size }, () => random());

  let _result: { min: number; max: number };

  bench("loop", () => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < size; i++) {
      const v = data[i]!;
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
    _result = { min, max };
  });

  const tree = new SegmentTree<{ min: number; max: number }>(
    data.map((v) => ({ min: v, max: v })),
    (a, b) => ({ min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) }),
    { min: Infinity, max: -Infinity },
  );

  bench("segment tree", () => {
    _result = tree.query(0, size - 1);
  });
});
