import {
  AR1,
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
} from "../math/affine.ts";
import { SegmentTree } from "segment-tree-rmq";

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

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

export class ChartData {
  public data: number[][];
  public readonly seriesByAxis: number[][] = [[], []];
  public bIndexFull: AR1Basis;
  public readonly startTime: number;
  public readonly timeStep: number;
  public startIndex: number;
  public readonly seriesCount: number;
  public readonly seriesAxes: number[];

  /**
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
  constructor(source: IDataSource) {
    if (source.length === 0) {
      throw new Error("ChartData requires a non-empty data array");
    }
    if (source.seriesCount < 1) {
      throw new Error("ChartData requires at least one series");
    }
    this.seriesCount = source.seriesCount;
    if (source.seriesAxes == null) {
      throw new Error("ChartData requires seriesAxes mapping");
    }
    this.seriesAxes = source.seriesAxes;
    if (this.seriesAxes.length !== this.seriesCount) {
      throw new Error(
        `ChartData requires seriesAxes length to match seriesCount (${this.seriesCount})`,
      );
    }
    let axisIdx = 0;
    for (const axis of this.seriesAxes) {
      if (axis !== 0 && axis !== 1) {
        throw new Error(
          `ChartData seriesAxes[${axisIdx}] must be 0 or 1; received ${axis}`,
        );
      }
      this.seriesByAxis[axis as 0 | 1].push(axisIdx);
      axisIdx++;
    }
    this.data = Array.from({ length: source.length }).map((_, i) =>
      Array.from({ length: this.seriesCount }).map((_, j) =>
        source.getSeries(i, j),
      ),
    );
    this.startTime = source.startTime;
    this.timeStep = source.timeStep;
    this.startIndex = 0;
    // bIndexFull represents the full range of data indices and remains constant
    // since append() maintains a sliding window of fixed length
    this.bIndexFull = new AR1Basis(0, this.data.length - 1);
  }

  append(...values: number[]): void {
    if (values.length !== this.seriesCount) {
      throw new Error(
        `ChartData.append requires ${this.seriesCount} values, received ${values.length}`,
      );
    }
    let valueIdx = 0;
    for (const val of values) {
      if (val == null || !Number.isFinite(val)) {
        throw new Error(
          `ChartData.append requires series ${valueIdx} value to be a finite number`,
        );
      }
      valueIdx++;
    }
    this.data.push(values);
    this.data.shift();
    this.startIndex++;
  }

  get length(): number {
    return this.data.length;
  }

  getPoint(idx: number): {
    values: number[];
    timestamp: number;
  } {
    if (!Number.isFinite(idx)) {
      throw new Error("ChartData.getPoint requires idx to be a finite number");
    }
    const clamped = this.clampIndex(Math.round(idx));
    return {
      values: this.data[clamped],
      timestamp: this.startTime + (this.startIndex + clamped) * this.timeStep,
    };
  }

  indexToTime(): AR1 {
    const bIndexBase = new AR1Basis(this.startIndex, this.startIndex + 1);
    const bTimeBase = new AR1Basis(
      this.startTime,
      this.startTime + this.timeStep,
    );
    return betweenTBasesAR1(bIndexBase, bTimeBase);
  }

  private clampIndex(idx: number): number {
    return Math.min(Math.max(idx, 0), this.data.length - 1);
  }

  private buildAxisMinMax(axis: number): Array<IMinMax | undefined> {
    const idxs = this.seriesByAxis[axis];
    return this.data.map((row) => {
      let min = Infinity;
      let max = -Infinity;
      for (const j of idxs) {
        const val = row[j];
        if (Number.isFinite(val)) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      }
      return min !== Infinity ? ({ min, max } as IMinMax) : undefined;
    });
  }

  buildAxisTree(axis: number): SegmentTree<IMinMax> {
    const arr = Array.from(
      this.buildAxisMinMax(axis),
      (v) => v ?? minMaxIdentity,
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
    return DirectProductBasis.fromProjections(this.bIndexFull, bAxisVisible);
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
