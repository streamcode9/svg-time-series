import { scaleLinear, type ScaleLinear, type ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import { SegmentTree } from "segment-tree-rmq";

import { MyAxis } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { AR1Basis, DirectProductBasis } from "../math/affine.ts";
import type { ChartData, IMinMax } from "./data.ts";
import { updateScaleX } from "./render/utils.ts";

function buildMinMax(fst: Readonly<IMinMax>, snd: Readonly<IMinMax>): IMinMax {
  return {
    min: Math.min(fst.min, snd.min),
    max: Math.max(fst.max, snd.max),
  } as const;
}

const minMaxIdentity: IMinMax = {
  min: Infinity,
  max: -Infinity,
};

export interface AxisModel {
  transform: ViewportTransform;
  scale: ScaleLinear<number, number>;
  tree: SegmentTree<IMinMax>;
}

export interface AxisRenderState {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

export function buildAxisTree(
  data: ChartData,
  axis: number,
): SegmentTree<IMinMax> {
  const idxs = data.seriesByAxis[axis] ?? [];
  const arr = data.data.map((row) =>
    idxs
      .map((j) => {
        const v = row[j]!;
        return { min: v, max: v } as IMinMax;
      })
      .reduce(buildMinMax, minMaxIdentity),
  );
  return new SegmentTree(arr, buildMinMax, minMaxIdentity);
}

export class AxisManager {
  public axes: AxisModel[] = [];
  public x!: ScaleTime<number, number>;

  create(treeCount: number): AxisModel[] {
    this.axes = Array.from({ length: treeCount }, () => ({
      transform: new ViewportTransform(),
      scale: scaleLinear<number, number>(),
      tree: new SegmentTree([minMaxIdentity], buildMinMax, minMaxIdentity),
    }));
    return this.axes;
  }

  setXAxis(scale: ScaleTime<number, number>): void {
    this.x = scale;
  }

  updateScales(bIndex: AR1Basis, data: ChartData): void {
    updateScaleX(this.x, bIndex, data);

    const domains = this.axes.map((a) => ({
      min: Infinity,
      max: -Infinity,
      transform: a.transform,
      scale: a.scale,
    }));

    const axisIndices: number[] = [];
    for (const idx of data.seriesAxes) {
      if (!axisIndices.includes(idx)) {
        axisIndices.push(idx);
      }
    }

    for (const i of axisIndices) {
      if (i >= this.axes.length) {
        throw new Error(
          `Series axis index ${i} out of bounds (max ${this.axes.length - 1})`,
        );
      }
      const tree = buildAxisTree(data, i);
      const axis = this.axes[i]!;
      axis.tree = tree;
      const dp = data.updateScaleY(bIndex, tree);
      const [min, max] = dp.y().toArr();
      const domain = domains[i]!;
      domain.min = Math.min(domain.min, min);
      domain.max = Math.max(domain.max, max);
    }

    for (const domain of domains) {
      let { min, max } = domain;
      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        min = 0;
        max = 1;
      }
      const b = new AR1Basis(min, max);
      const dp = DirectProductBasis.fromProjections(data.bIndexFull, b);
      domain.transform.onReferenceViewWindowResize(dp);
      domain.scale.domain([min, max]);
    }
  }
}
