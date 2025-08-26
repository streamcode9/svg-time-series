import { scaleLinear } from "d3-scale";
import type { ScaleLinear, ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import type { ZoomTransform } from "d3-zoom";
import { SegmentTree } from "segment-tree-rmq";

import type { MyAxis } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import type { ChartData } from "./data.ts";
import type { DataWindow } from "./dataWindow.ts";
import type { IMinMax } from "./axisData.ts";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";

export class AxisModel {
  transform: ViewportTransform;
  baseScale: ScaleLinear<number, number>;
  scale: ScaleLinear<number, number>;
  tree: SegmentTree<IMinMax>;

  constructor() {
    this.transform = new ViewportTransform();
    this.baseScale = scaleLinear<number, number>().domain([0, 1]);
    this.scale = this.baseScale.copy();

    this.tree = new SegmentTree([minMaxIdentity], buildMinMax, minMaxIdentity);
  }

  updateFromData(
    tree: SegmentTree<IMinMax>,
    baseScaleRaw: ScaleLinear<number, number>,
    fullIndex: readonly [number, number],
  ): void {
    this.tree = tree;
    this.baseScale.domain(baseScaleRaw.domain() as [number, number]);
    this.baseScale.range(this.scale.range() as [number, number]);
    this.transform.onReferenceViewWindowResize(
      fullIndex,
      this.baseScale.domain() as [number, number],
    );
  }
}

export interface AxisRenderState {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  lastDomain: [number | Date, number | Date];
  lastRange: [number, number];
}

export function createBaseXScale(
  x: ScaleTime<number, number>,
  window: DataWindow,
): ScaleTime<number, number> {
  return x.copy().domain(window.timeDomainFull()).nice();
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
    this.data.window.onViewPortResize(scale.range() as [number, number]);
  }

  updateScales(transform: ZoomTransform): void {
    this.data.assertAxisBounds(this.axes.length);
    const baseX = createBaseXScale(this.x, this.data.window);
    const dIndexVisible = this.data.window.dIndexFromTransform(transform);
    this.x = transform.rescaleX(baseX).copy();
    this.axes.forEach((model, i) => {
      const idxs = this.data.seriesByAxis[i] ?? [];
      if (idxs.length === 0) {
        return;
      }
      const { tree, scale: baseScaleRaw } =
        this.data.axes[i]!.axisTransform(dIndexVisible);
      model.updateFromData(tree, baseScaleRaw, this.data.window.bIndexFull);
      model.scale = transform.rescaleY(model.baseScale).copy();
    });
  }
}
