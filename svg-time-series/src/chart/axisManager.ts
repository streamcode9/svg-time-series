import { scaleLinear } from "d3-scale";
import type { ScaleLinear, ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import { SegmentTree } from "segment-tree-rmq";

import type { MyAxis } from "../axis.ts";
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

export class AxisModel {
  transform: ViewportTransform;
  scale: ScaleLinear<number, number>;
  tree: SegmentTree<IMinMax>;
  min: number;
  max: number;

  constructor() {
    this.transform = new ViewportTransform();
    this.scale = scaleLinear<number, number>();
    this.tree = new SegmentTree([minMaxIdentity], buildMinMax, minMaxIdentity);
    this.min = 0;
    this.max = 1;
  }

  updateAxisTransform(
    data: ChartData,
    axisIdx: number,
    bIndex: AR1Basis,
  ): void {
    this.tree = data.buildAxisTree(axisIdx);
    const dp = data.updateScaleY(bIndex, this.tree);
    let [min, max] = dp.y().toArr();
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    this.min = min;
    this.max = max;
    const b = new AR1Basis(min, max);
    const dpRef = DirectProductBasis.fromProjections(data.bIndexFull, b);
    this.transform.onReferenceViewWindowResize(dpRef);
    this.scale.domain([min, max]);
  }
}

export interface AxisRenderState {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

export class AxisManager {
  public axes: AxisModel[] = [];
  public x!: ScaleTime<number, number>;

  create(treeCount: number): AxisModel[] {
    this.axes = Array.from({ length: treeCount }, () => new AxisModel());
    return this.axes;
  }

  setXAxis(scale: ScaleTime<number, number>): void {
    this.x = scale;
  }

  updateScales(bIndex: AR1Basis, data: ChartData): void {
    updateScaleX(this.x, bIndex, data);
    for (const [i, idxs] of data.seriesByAxis.entries()) {
      if (idxs.length === 0) {
        continue;
      }
      if (i >= this.axes.length) {
        throw new Error(
          `Series axis index ${String(i)} out of bounds (max ${String(
            this.axes.length - 1,
          )})`,
        );
      }
      this.axes[i]!.updateAxisTransform(data, i, bIndex);
    }
  }
}
