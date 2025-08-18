import type { ZoomTransform } from "d3-zoom";
import type { ScaleLinear } from "d3-scale";
import type { SegmentTree } from "segment-tree-rmq";

import { assertFiniteNumber, assertPositiveInteger } from "./validation.ts";
import type { LegendPoint } from "./legend.ts";
import { DataWindow } from "./dataWindow.ts";
import {
  AxisData,
  type IMinMax,
  scaleY as scaleYAxis,
  combinedAxisDomain as computeCombinedAxisDomain,
} from "./axisData.ts";

export interface IDataSource {
  readonly startTime: number;
  readonly timeStep: number;
  readonly length: number;
  /**
   * Mapping from series index to Y-axis index. Each entry must be either 0 or 1.
   */
  readonly seriesAxes: number[];
  getSeries(index: number, seriesIdx: number): number;
}

export class ChartData {
  private static validateSource(source: IDataSource): void {
    assertPositiveInteger(source.length, "ChartData length");
    assertFiniteNumber(source.startTime, "ChartData startTime");
    assertFiniteNumber(source.timeStep, "ChartData timeStep");
    if (source.timeStep <= 0) {
      throw new Error("ChartData requires timeStep to be greater than 0");
    }
    assertPositiveInteger(
      source.seriesAxes.length,
      "ChartData requires at least one series",
    );
    source.seriesAxes.forEach((axis, axisIdx) => {
      if (axis !== 0 && axis !== 1) {
        throw new Error(
          `ChartData seriesAxes[${String(axisIdx)}] must be 0 or 1; received ${String(
            axis,
          )}`,
        );
      }
    });
  }

  public readonly seriesByAxis: [number[], number[]] = [[], []];
  public readonly seriesAxes: number[];
  public readonly seriesCount: number;
  public readonly startTime: number;
  public readonly timeStep: number;
  public readonly window: DataWindow;
  public readonly axes: [AxisData, AxisData];

  constructor(source: IDataSource) {
    ChartData.validateSource(source);
    this.seriesAxes = source.seriesAxes;
    this.seriesCount = this.seriesAxes.length;
    this.seriesAxes.forEach((axis, axisIdx) =>
      this.seriesByAxis[axis as 0 | 1].push(axisIdx),
    );
    const initialData = Array.from({ length: source.length }).map((_, i) =>
      Array.from({ length: this.seriesCount }).map((_, j) =>
        source.getSeries(i, j),
      ),
    );
    this.window = new DataWindow(
      initialData,
      source.startTime,
      source.timeStep,
    );
    this.startTime = this.window.startTime;
    this.timeStep = this.window.timeStep;
    this.axes = [
      new AxisData(this.window, this.seriesByAxis[0]),
      new AxisData(this.window, this.seriesByAxis[1]),
    ];
  }

  append(...values: number[]): void {
    this.window.append(...values);
    this.axes.forEach((a) => {
      a.invalidate();
    });
  }

  get length(): number {
    return this.window.length;
  }

  get data(): number[][] {
    return this.window.data;
  }

  get startIndex(): number {
    return this.window.startIndex;
  }

  get bIndexFull(): readonly [number, number] {
    return this.window.bIndexFull;
  }

  getPoint(idx: number): LegendPoint {
    assertFiniteNumber(idx, "ChartData.getPoint idx");
    return this.window.getPoint(idx);
  }

  indexToTime(idx: number): Date {
    assertFiniteNumber(idx, "ChartData.indexToTime idx");
    return new Date(this.window.indexToTime(idx));
  }

  timeToIndex(time: Date): number {
    assertFiniteNumber(+time, "ChartData.timeToIndex time");
    return this.window.timeToIndex(time);
  }

  timeDomainFull(): [Date, Date] {
    return this.window.timeDomainFull();
  }

  dIndexFromTransform(transform: ZoomTransform): [number, number] {
    return this.window.dIndexFromTransform(transform);
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    return this.window.clampIndex(idx);
  }

  public assertAxisBounds(axisCount: number): void {
    this.seriesByAxis.forEach((series, i) => {
      if (i >= axisCount && series.length > 0) {
        throw new Error(
          `Series axis index ${String(i)} out of bounds (max ${String(axisCount - 1)})`,
        );
      }
    });
  }

  buildAxisTree(axis: 0 | 1): SegmentTree<IMinMax> {
    return this.axes[axis].buildTree();
  }

  scaleY(
    bIndexVisible: readonly [number, number],
    tree: SegmentTree<IMinMax>,
  ): ScaleLinear<number, number> {
    return scaleYAxis(this.window, bIndexVisible, tree);
  }

  axisTransform(
    axisIdx: number,
    dIndexVisible: [number, number],
  ): {
    tree: SegmentTree<IMinMax>;
    scale: ScaleLinear<number, number>;
  } {
    return this.axes[axisIdx as 0 | 1].axisTransform(dIndexVisible);
  }

  combinedAxisDomain(
    bIndexVisible: readonly [number, number],
    tree0: SegmentTree<IMinMax>,
    tree1: SegmentTree<IMinMax>,
  ): ScaleLinear<number, number> {
    return computeCombinedAxisDomain(this.window, bIndexVisible, tree0, tree1);
  }
}
