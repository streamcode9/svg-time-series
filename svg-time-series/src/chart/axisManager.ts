import { scaleLinear } from "d3-scale";
import type { ScaleLinear, ScaleTime } from "d3-scale";
import type { Selection } from "d3-selection";
import type { ZoomTransform } from "d3-zoom";
import { SegmentTree } from "segment-tree-rmq";

import type { MyAxis } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
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
    dIndex: [number, number],
    transform: ZoomTransform,
  ): void {
    const { tree, scale: scaleRaw } = data.axisTransform(axisIdx, dIndex);
    this.tree = tree;
    const scale = scaleRaw.copy().range(this.scale.range() as [number, number]);
    const rescaled = transform.rescaleY(scale);
    this.transform.onReferenceViewWindowResize([
      data.bIndexFull,
      scale.domain() as [number, number],
    ]);
    this.scale = rescaled.copy();
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
    this.x.domain(this.data.timeDomainFull());
    const indexScale = this.data.bIndexFromTransform(
      transform,
      this.x.range() as [number, number],
    );
    const rescaledX = transform.rescaleX(this.x);
    this.x = rescaledX.copy();
    this.axes.forEach((a, i) => {
      const idxs = this.data.seriesByAxis[i] ?? [];
      if (idxs.length === 0) {
        return;
      }
      a.updateAxisTransform(
        this.data,
        i,
        indexScale.domain() as [number, number],
        transform,
      );
    });
  }
}
