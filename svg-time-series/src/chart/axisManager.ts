import { scaleLinear } from "d3-scale";
import type { ScaleLinear, ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import { SegmentTree } from "segment-tree-rmq";

import type { MyAxis } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import type { AR1Basis } from "../math/affine.ts";
import type { ChartData, IMinMax } from "./data.ts";
import { updateScaleX } from "./render/utils.ts";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";

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
    const { tree, min, max, dpRef } = data.axisTransform(axisIdx, bIndex);
    this.tree = tree;
    this.min = min;
    this.max = max;
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
