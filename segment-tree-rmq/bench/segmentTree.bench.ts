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

describe("SegmentTree performance", () => {
  const size = 100_000;
  const data = Array.from({ length: size }, () => random());
  const tree = new SegmentTree<number>(data, (a, b) => a + b, 0);

  const updateIndices = Array.from({ length: 1000 }, () =>
    Math.floor(random() * size),
  );
  let ui = 0;

  bench("update", () => {
    tree.update(updateIndices[ui], random());
    ui = (ui + 1) % updateIndices.length;
  });

  const queryRanges = Array.from({ length: 1000 }, () => {
    const l = Math.floor(random() * size);
    const r = l + Math.floor(random() * (size - l));
    return [l, r] as const;
  });
  let qi = 0;

  bench("query", () => {
    const [l, r] = queryRanges[qi];
    tree.query(l, r);
    qi = (qi + 1) % queryRanges.length;
  });
});
