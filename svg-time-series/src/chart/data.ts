import {
  AR1,
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
  bUnit,
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
  getSeries(index: number, seriesIdx: number): number;
}

export class ChartData {
  public data: Array<[number, number?]>;
  public treeNy!: SegmentTree<IMinMax>;
  public treeSf?: SegmentTree<IMinMax>;
  public idxToTime: AR1;
  private idxShift: AR1;
  public bIndexFull: AR1Basis;
  private hasSf: boolean;

  /**
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
  constructor(source: IDataSource) {
    if (source.length === 0) {
      throw new Error("ChartData requires a non-empty data array");
    }
    if (source.seriesCount !== 1 && source.seriesCount !== 2) {
      throw new Error(
        `ChartData supports 1 or 2 series, but received ${source.seriesCount}`,
      );
    }
    this.hasSf = source.seriesCount > 1;
    this.data = new Array(source.length);
    for (let i = 0; i < source.length; i++) {
      const ny = source.getSeries(i, 0);
      const sf = this.hasSf ? source.getSeries(i, 1) : undefined;
      this.data[i] = [ny, sf];
    }
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(source.startTime, source.startTime + source.timeStep),
    );
    this.idxShift = betweenTBasesAR1(new AR1Basis(-1, 0), bUnit);
    // bIndexFull represents the full range of data indices and remains constant
    // since append() maintains a sliding window of fixed length
    this.bIndexFull = new AR1Basis(0, this.data.length - 1);
    this.rebuildSegmentTrees();
  }

  append(ny: number, sf?: number): void {
    if (ny == null || !Number.isFinite(ny)) {
      throw new Error("ChartData.append requires ny to be a finite number");
    }
    if (this.hasSf) {
      if (sf == null || !Number.isFinite(sf)) {
        throw new Error("ChartData.append requires sf to be a finite number");
      }
    }
    this.data.push([ny, this.hasSf ? sf! : undefined]);
    this.data.shift();
    this.idxToTime = this.idxShift.composeWith(this.idxToTime);
    this.rebuildSegmentTrees();
  }

  get length(): number {
    return this.data.length;
  }

  getPoint(idx: number): {
    ny: number;
    sf?: number;
    timestamp: number;
  } {
    if (!Number.isFinite(idx)) {
      throw new Error("ChartData.getPoint requires idx to be a finite number");
    }
    const clamped = this.clampIndex(Math.round(idx));
    const [ny, sf] = this.data[clamped];
    return {
      ny,
      sf,
      timestamp: this.idxToTime.applyToPoint(clamped),
    };
  }

  private clampIndex(idx: number): number {
    return Math.min(Math.max(idx, 0), this.data.length - 1);
  }

  private buildSeriesMinMax(seriesIdx: 0 | 1): IMinMax[] {
    const result: IMinMax[] = new Array(this.data.length);
    for (let i = 0; i < this.data.length; i++) {
      const val = this.data[i][seriesIdx]!;
      const minVal = isNaN(val) ? Infinity : val;
      const maxVal = isNaN(val) ? -Infinity : val;
      result[i] = { min: minVal, max: maxVal } as IMinMax;
    }
    return result;
  }

  private rebuildSegmentTrees(): void {
    const nyData = this.buildSeriesMinMax(0);
    this.treeNy = new SegmentTree(nyData, buildMinMax, minMaxIdentity);

    if (this.hasSf) {
      const sfData = this.buildSeriesMinMax(1);
      this.treeSf = new SegmentTree(sfData, buildMinMax, minMaxIdentity);
    } else {
      this.treeSf = undefined;
    }
  }

  bTemperatureVisible(
    bIndexVisible: AR1Basis,
    tree: SegmentTree<IMinMax>,
  ): AR1Basis {
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

  combinedTemperatureDp(bIndexVisible: AR1Basis): {
    combined: AR1Basis;
    dp: DirectProductBasis;
  } {
    if (!this.treeSf) {
      throw new Error("Second series data is unavailable");
    }
    const bNy = this.bTemperatureVisible(bIndexVisible, this.treeNy);
    const bSf = this.bTemperatureVisible(bIndexVisible, this.treeSf);
    const [nyMin, nyMax] = bNy.toArr();
    const [sfMin, sfMax] = bSf.toArr();
    const combined = new AR1Basis(
      Math.min(nyMin, sfMin),
      Math.max(nyMax, sfMax),
    );
    const dp = DirectProductBasis.fromProjections(this.bIndexFull, combined);
    return { combined, dp };
  }
}
