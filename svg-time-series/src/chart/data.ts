import { SegmentTree } from "segment-tree-rmq";

import { scaleLinear, type ScaleLinear } from "d3-scale";
import type { ZoomTransform } from "d3-zoom";
import { AR1Basis, DirectProductBasis } from "../math/affine.ts";
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

function validateSource(source: IDataSource): void {
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

export class ChartData {
  private readonly window: SlidingWindow;
  public readonly seriesByAxis: [number[], number[]] = [[], []];
  public bIndexFull: AR1Basis;
  public readonly startTime: number;
  public readonly timeStep: number;
  public readonly seriesCount: number;
  public readonly seriesAxes: number[];
  /**
   * Persistent mapping from window-relative index to timestamp.
   * Domain remains [0, 1] and the range shifts forward with the
   * sliding window to avoid recreating the scale on every query.
   */
  public readonly indexToTime: ScaleLinear<number, number>;

  /**
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
  constructor(source: IDataSource) {
    validateSource(source);
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
    this.bIndexFull = new AR1Basis(0, this.window.length - 1);
    this.indexToTime = scaleLinear<number, number>()
      .domain([0, 1])
      .range([this.startTime, this.startTime + this.timeStep]);
  }

  append(...values: number[]): void {
    this.window.append(...values);
    const [r0, r1] = this.indexToTime.range() as [number, number];
    this.indexToTime.range([r0 + this.timeStep, r1 + this.timeStep]);
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
    const clamped = this.clampIndex(Math.round(idx));
    return {
      values: this.window.data[clamped]!,
      timestamp:
        this.startTime + (this.window.startIndex + clamped) * this.timeStep,
    };
  }

  timeToIndex(time: number): number {
    assertFiniteNumber(time, "ChartData.timeToIndex time");
    const idx = this.indexToTime.invert(time);
    return this.clampIndex(idx);
  }

  timeDomainFull(): [Date, Date] {
    const toTime = this.indexToTime;
    return this.bIndexFull.toArr().map((i) => new Date(toTime(i))) as [
      Date,
      Date,
    ];
  }

  bIndexFromTransform(
    transform: ZoomTransform,
    range: [number, number],
  ): AR1Basis {
    const indexBase = scaleLinear<number, number>()
      .domain(this.bIndexFull.toArr())
      .range(range);
    const [i0, i1] = transform.rescaleX(indexBase).domain() as [number, number];
    return new AR1Basis(i0, i1);
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    return Math.min(Math.max(idx, 0), this.window.length - 1);
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
    const idxs = this.seriesByAxis[axis];
    const arr = this.data.map((row) =>
      idxs
        .map((j) => {
          const v = row[j]!;
          return Number.isFinite(v) ? { min: v, max: v } : minMaxIdentity;
        })
        .reduce(buildMinMax, minMaxIdentity),
    );
    return new SegmentTree(arr, buildMinMax, minMaxIdentity);
  }
  bAxisVisible(bIndexVisible: AR1Basis, tree: SegmentTree<IMinMax>): AR1Basis {
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    let startIdx = Math.floor(minIdxX);
    let endIdx = Math.ceil(maxIdxX);
    startIdx = this.clampIndex(startIdx);
    endIdx = this.clampIndex(endIdx);
    if (startIdx > endIdx) {
      [startIdx, endIdx] = [endIdx, startIdx];
    }
    const { min, max } = tree.query(startIdx, endIdx);
    return new AR1Basis(min, max);
  }

  updateScaleY(
    bIndexVisible: AR1Basis,
    tree: SegmentTree<IMinMax>,
  ): DirectProductBasis {
    const bAxisVisible = this.bAxisVisible(bIndexVisible, tree);
    return DirectProductBasis.fromProjections(bIndexVisible, bAxisVisible);
  }

  axisTransform(
    axisIdx: number,
    bIndexVisible: AR1Basis,
  ): {
    tree: SegmentTree<IMinMax>;
    min: number;
    max: number;
    dpRef: DirectProductBasis;
  } {
    const tree = this.buildAxisTree(axisIdx);
    const dp = this.updateScaleY(bIndexVisible, tree);
    let [min, max] = dp.y().toArr();
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    const b = new AR1Basis(min, max);
    const dpRef = DirectProductBasis.fromProjections(this.bIndexFull, b);
    return { tree, min, max, dpRef };
  }

  combinedAxisDp(
    bIndexVisible: AR1Basis,
    tree0: SegmentTree<IMinMax>,
    tree1: SegmentTree<IMinMax>,
  ): {
    combined: AR1Basis;
    dp: DirectProductBasis;
  } {
    const b0 = this.bAxisVisible(bIndexVisible, tree0);
    const b1 = this.bAxisVisible(bIndexVisible, tree1);
    const [min0, max0] = b0.toArr();
    const [min1, max1] = b1.toArr();
    const combined = new AR1Basis(Math.min(min0, min1), Math.max(max0, max1));
    const dp = DirectProductBasis.fromProjections(this.bIndexFull, combined);
    return { combined, dp };
  }
}
