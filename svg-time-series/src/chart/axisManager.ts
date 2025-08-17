import { scaleLinear } from "d3-scale";
import type { ScaleLinear, ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import type { ZoomTransform } from "d3-zoom";
import { SegmentTree } from "segment-tree-rmq";

import type { MyAxis } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import type { Basis } from "../basis.ts";
import type { ChartData, IMinMax } from "./data.ts";
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

  updateFromData(
    tree: SegmentTree<IMinMax>,
    baseScaleRaw: ScaleLinear<number, number>,
    transform: ZoomTransform,
    fullIndex: Basis,
  ): void {
    this.tree = tree;
    const baseScale = baseScaleRaw
      .copy()
      .range(this.scale.range() as [number, number]);
    this.transform.onReferenceViewWindowResize([
      fullIndex,
      baseScale.domain() as [number, number],
    ]);
    this.scale = transform.rescaleY(baseScale).copy();
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

  updateScales(transform: ZoomTransform): void {
    this.data.assertAxisBounds(this.axes.length);
    const baseX = this.x.copy().domain(this.data.timeDomainFull()).nice();
    const dIndexVisible = this.data.dIndexFromTransform(
      transform,
      baseX.range() as [number, number],
    );
    this.x = transform.rescaleX(baseX).copy();
    this.axes.forEach((a, i) => {
      const idxs = this.data.seriesByAxis[i] ?? [];
      if (idxs.length === 0) {
        return;
      }
      const { tree, scale: baseScaleRaw } = this.data.axisTransform(
        i as 0 | 1,
        dIndexVisible,
      );
      a.updateFromData(tree, baseScaleRaw, transform, this.data.bIndexFull);
    });
  }
}
