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

  constructor() {
    this.transform = new ViewportTransform();
    this.scale = scaleLinear<number, number>().domain([0, 1]);
    this.tree = new SegmentTree([minMaxIdentity], buildMinMax, minMaxIdentity);
  }

  get min(): number {
    return this.scale.domain()[0]!;
  }

  set min(v: number) {
    const [, max] = this.scale.domain();
    this.scale.domain([v, max!]);
  }

  get max(): number {
    return this.scale.domain()[1]!;
  }

  set max(v: number) {
    const [min] = this.scale.domain();
    this.scale.domain([min!, v]);
  }

  updateAxisTransform(
    data: ChartData,
    axisIdx: number,
    bIndex: AR1Basis,
  ): void {
    const { tree, min, max, dpRef } = data.axisTransform(axisIdx, bIndex);
    this.tree = tree;
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
  private data: ChartData;

  constructor(treeCount: number, data: ChartData) {
    this.data = data;
    this.axes = Array.from({ length: treeCount }, () => new AxisModel());
  }

  setData(data: ChartData): void {
    this.data = data;
  }

  setXAxis(scale: ScaleTime<number, number>): void {
    this.x = scale;
  }

  updateScales(bIndex: AR1Basis): void {
    this.data.assertAxisBounds(this.axes.length);
    updateScaleX(this.x, bIndex, this.data);
    for (const [i, idxs] of this.data.seriesByAxis.entries()) {
      if (idxs.length === 0) {
        continue;
      }
      this.axes[i]!.updateAxisTransform(this.data, i, bIndex);
    }
  }
}
