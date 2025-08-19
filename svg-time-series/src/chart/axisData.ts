import { extent } from "d3-array";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { SegmentTree } from "segment-tree-rmq";

import type { DataWindow } from "./dataWindow.ts";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

function scaleYRange(
  window: DataWindow,
  bIndexVisible: readonly [number, number],
  tree: SegmentTree<IMinMax>,
): [number, number] {
  const [minIdxX, maxIdxX] = bIndexVisible;
  const i0 = window.clampIndex(minIdxX);
  const i1 = window.clampIndex(maxIdxX);
  const startIdx = Math.floor(Math.min(i0, i1));
  const endIdx = Math.ceil(Math.max(i0, i1));
  const { min, max } = tree.query(startIdx, endIdx);
  const [y0 = NaN, y1 = NaN] = extent([min, max]);
  if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
    return [0, 0];
  }
  return y0 === y1 ? [y0 - 0.5, y1 + 0.5] : [y0, y1];
}

export function scaleY(
  window: DataWindow,
  bIndexVisible: readonly [number, number],
  tree: SegmentTree<IMinMax>,
): ScaleLinear<number, number> {
  return scaleLinear<number, number>()
    .domain(scaleYRange(window, bIndexVisible, tree))
    .nice();
}

export class AxisData {
  private tree: SegmentTree<IMinMax> | undefined;
  constructor(
    private window: DataWindow,
    private readonly seriesIdxs: readonly number[],
  ) {}

  invalidate(): void {
    this.tree = undefined;
  }

  buildTree(): SegmentTree<IMinMax> {
    if (this.tree) {
      return this.tree;
    }
    const arr = this.window.data.map((row) =>
      this.seriesIdxs
        .map((j) => {
          const v = row[j]!;
          return Number.isFinite(v) ? { min: v, max: v } : minMaxIdentity;
        })
        .reduce(buildMinMax, minMaxIdentity),
    );
    this.tree = new SegmentTree(arr, buildMinMax, minMaxIdentity);
    return this.tree;
  }

  axisTransform(dIndexVisible: [number, number]): {
    tree: SegmentTree<IMinMax>;
    scale: ScaleLinear<number, number>;
  } {
    const tree = this.buildTree();
    const scale = scaleY(this.window, dIndexVisible, tree);
    return { tree, scale };
  }
}

export function combinedAxisDomain(
  window: DataWindow,
  bIndexVisible: readonly [number, number],
  tree0: SegmentTree<IMinMax>,
  tree1: SegmentTree<IMinMax>,
): ScaleLinear<number, number> {
  const d0 = scaleY(window, bIndexVisible, tree0).domain() as [number, number];
  const d1 = scaleY(window, bIndexVisible, tree1).domain() as [number, number];
  const [min, max] = extent([...d0, ...d1]) as [number, number];
  return scaleLinear<number, number>().domain([min, max]).nice();
}
