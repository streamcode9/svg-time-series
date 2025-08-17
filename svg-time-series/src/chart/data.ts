import { SegmentTree } from "segment-tree-rmq";

import {
  scaleLinear,
  scaleUtc,
  type ScaleLinear,
  type ScaleTime,
} from "d3-scale";
import { extent } from "d3-array";
import type { ZoomTransform } from "d3-zoom";
import { SlidingWindow } from "./slidingWindow.ts";
import { assertFiniteNumber, assertPositiveInteger } from "./validation.ts";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";
import type { LegendPoint } from "./legend.ts";

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

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

  private readonly window: SlidingWindow;
  public readonly seriesByAxis: [number[], number[]] = [[], []];
  public bIndexFull: [number, number];
  public readonly startTime: number;
  public readonly timeStep: number;
  public readonly seriesCount: number;
  public readonly seriesAxes: number[];
  /**
   * Persistent mapping from window-relative index to timestamp.
   * Domain remains [0, 1] and the range shifts forward with the
   * sliding window to avoid recreating the scale on every query.
   */
  public readonly indexToTime: ScaleTime<Date, Date>;
  /**
   * Persistent mapping from data index to screen range. The domain never
   * changes, and the range is updated on demand in `dIndexFromTransform` to
   * avoid reconstructing the scale for every call.
   */
  private readonly indexScale: ScaleLinear<number, number>;
  private axisTrees: [
    SegmentTree<IMinMax> | undefined,
    SegmentTree<IMinMax> | undefined,
  ];

  /**
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
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
    this.window = new SlidingWindow(initialData);
    this.startTime = source.startTime;
    this.timeStep = source.timeStep;
    // bIndexFull represents the full range of data indices and remains constant
    // since append() maintains a sliding window of fixed length
    this.bIndexFull = [0, this.window.length - 1];
    this.indexToTime = scaleUtc<Date, Date>()
      .clamp(true)
      .domain(this.bIndexFull)
      .range([
        new Date(this.startTime),
        new Date(this.startTime + (this.window.length - 1) * this.timeStep),
      ]);
    this.indexScale = scaleLinear<number, number>()
      .clamp(true)
      .domain(this.bIndexFull)
      .range([0, 1]);
    this.axisTrees = [undefined, undefined];
  }

  append(...values: number[]): void {
    this.window.append(...values);
    const [r0, r1] = this.indexToTime.range() as [Date, Date];
    this.indexToTime.range([
      new Date(+r0 + this.timeStep),
      new Date(+r1 + this.timeStep),
    ]);
    this.axisTrees = [undefined, undefined];
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

  getPoint(idx: number): LegendPoint {
    assertFiniteNumber(idx, "ChartData.getPoint idx");
    const clamped = Math.round(this.clampIndex(idx));
    return {
      values: this.window.data[clamped]!,
      timestamp:
        this.startTime + (this.window.startIndex + clamped) * this.timeStep,
    };
  }

  timeToIndex(time: Date): number {
    assertFiniteNumber(+time, "ChartData.timeToIndex time");
    return +this.indexToTime.invert(time);
  }

  timeDomainFull(): [Date, Date] {
    const toTime = this.indexToTime.copy().clamp(false);
    return this.bIndexFull.map((i) => toTime(i)) as [Date, Date];
  }

  dIndexFromTransform(
    transform: ZoomTransform,
    range: [number, number],
  ): [number, number] {
    this.indexScale.range(range);
    return transform.rescaleX(this.indexScale).domain() as [number, number];
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    return this.indexScale.invert(this.indexScale(idx));
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

  buildAxisTree(axis: number): SegmentTree<IMinMax> {
    if (axis !== 0 && axis !== 1) {
      throw new Error(
        `ChartData.buildAxisTree axis must be 0 or 1; received ${String(axis)}`,
      );
    }
    const axisIdx = axis;
    const cached = this.axisTrees[axisIdx];
    if (cached) {
      return cached;
    }
    const idxs = this.seriesByAxis[axisIdx];
    const arr = this.data.map((row) =>
      idxs
        .map((j) => {
          const v = row[j]!;
          return Number.isFinite(v) ? { min: v, max: v } : minMaxIdentity;
        })
        .reduce(buildMinMax, minMaxIdentity),
    );
    const tree = new SegmentTree(arr, buildMinMax, minMaxIdentity);
    this.axisTrees[axisIdx] = tree;
    return tree;
  }
  scaleY(
    bIndexVisible: readonly [number, number],
    tree: SegmentTree<IMinMax>,
  ): ScaleLinear<number, number> {
    const [minIdxX, maxIdxX] = bIndexVisible;
    const i0 = this.clampIndex(minIdxX);
    const i1 = this.clampIndex(maxIdxX);
    const startIdx = Math.floor(Math.min(i0, i1));
    const endIdx = Math.ceil(Math.max(i0, i1));
    const { min, max } = tree.query(startIdx, endIdx);
    let [y0, y1] = extent([min, max]) as [
      number | undefined,
      number | undefined,
    ];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) {
      y0 = 0;
      y1 = 1;
    } else if (y0 === y1) {
      const epsilon = 0.5;
      y0 = (y0 as number) - epsilon;
      y1 = (y1 as number) + epsilon;
    }
    return scaleLinear<number, number>().domain([y0!, y1!]).nice();
  }

  axisTransform(
    axisIdx: number,
    dIndexVisible: [number, number],
  ): {
    tree: SegmentTree<IMinMax>;
    scale: ScaleLinear<number, number>;
  } {
    const tree = this.buildAxisTree(axisIdx);
    const scale = this.scaleY([dIndexVisible[0], dIndexVisible[1]], tree);
    return { tree, scale };
  }

  combinedAxisDp(
    bIndexVisible: readonly [number, number],
    tree0: SegmentTree<IMinMax>,
    tree1: SegmentTree<IMinMax>,
  ): ScaleLinear<number, number> {
    const d0 = this.scaleY(bIndexVisible, tree0).domain() as [number, number];
    const d1 = this.scaleY(bIndexVisible, tree1).domain() as [number, number];
    const [min, max] = extent([...d0, ...d1]) as [number, number];
    return scaleLinear<number, number>().domain([min, max]).nice();
  }
}
