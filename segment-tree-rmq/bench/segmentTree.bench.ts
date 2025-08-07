import { bench, describe } from "vitest";
import { SegmentTree } from "../src/index.ts";

describe("SegmentTree performance", () => {
  const size = 100_000;
  const data = Array.from({ length: size }, () => Math.random());
  const tree = new SegmentTree<number>(data, (a, b) => a + b, 0);

  const updateIndices = Array.from({ length: 1000 }, () =>
    Math.floor(Math.random() * size),
  );
  let ui = 0;

  bench("update", () => {
    tree.update(updateIndices[ui], Math.random());
    ui = (ui + 1) % updateIndices.length;
  });

  const queryRanges = Array.from({ length: 1000 }, () => {
    const l = Math.floor(Math.random() * size);
    const r = l + Math.floor(Math.random() * (size - l));
    return [l, r] as const;
  });
  let qi = 0;

  bench("query", () => {
    const [l, r] = queryRanges[qi];
    tree.query(l, r);
    qi = (qi + 1) % queryRanges.length;
  });
});
