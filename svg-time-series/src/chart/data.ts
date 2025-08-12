import type { SegmentTree } from "segment-tree-rmq";

import type { AR1 } from "../math/affine.ts";
import {
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
} from "../math/affine.ts";
import { SlidingWindow } from "./slidingWindow.ts";
import { assertFiniteNumber, assertPositiveInteger } from "./validation.ts";

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

export interface IDataSource {
  readonly startTime: number;
  readonly timeStep: number;
  readonly length: number;
  readonly seriesCount: number;
  /**
   * Mapping from series index to Y-axis index. Each entry must be either 0 or 1
   * and the array length must equal `seriesCount`.
   */
  readonly seriesAxes: number[];
  getSeries(index: number, seriesIdx: number): number;
}

function validateSource(source: IDataSource): void {
  assertPositiveInteger(source.length, "ChartData length");
  assertPositiveInteger(source.seriesCount, "ChartData seriesCount");
  assertFiniteNumber(source.startTime, "ChartData startTime");
  assertFiniteNumber(source.timeStep, "ChartData timeStep");
  if (source.timeStep <= 0) {
    throw new Error("ChartData requires timeStep to be greater than 0");
  }
  if (source.seriesAxes.length !== source.seriesCount) {
    throw new Error(
      `ChartData requires seriesAxes length to match seriesCount (${String(
        source.seriesCount,
      )})`,
    );
  }
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
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
  constructor(source: IDataSource) {
    validateSource(source);
    this.seriesCount = source.seriesCount;
    this.seriesAxes = source.seriesAxes;
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
  }

  append(...values: number[]): void {
    this.window.append(...values);
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

  getPoint(idx: number): {
    values: number[];
    timestamp: number;
  } {
    assertFiniteNumber(idx, "ChartData.getPoint idx");
    const clamped = this.clampIndex(Math.round(idx));
    return {
      values: this.window.data[clamped]!,
      timestamp:
        this.startTime + (this.window.startIndex + clamped) * this.timeStep,
    };
  }

  indexToTime(): AR1 {
    const bIndexBase = new AR1Basis(
      this.window.startIndex,
      this.window.startIndex + 1,
    );
    const bTimeBase = new AR1Basis(
      this.startTime,
      this.startTime + this.timeStep,
    );
    return betweenTBasesAR1(bIndexBase, bTimeBase);
  }

  timeToIndex(time: number): number {
    assertFiniteNumber(time, "ChartData.timeToIndex time");
    const transform = this.indexToTime().inverse();
    const idx = transform.applyToPoint(time);
    return this.clampIndex(idx);
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    return Math.min(Math.max(idx, 0), this.window.length - 1);
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
