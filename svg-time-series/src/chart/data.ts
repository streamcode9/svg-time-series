import {
  AR1,
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
  bUnit,
} from "../math/affine.ts";
import { IMinMax, SegmentTree } from "../segmentTree.ts";

export interface IDataSource {
  readonly startTime: number;
  readonly timeStep: number;
  readonly length: number;
  getNy(index: number): number;
  getSf?(index: number): number;
}

export type { IMinMax };

export class ChartData {
  public data: Array<[number, number?]>;
  public treeNy!: SegmentTree<[number, number?]>;
  public treeSf?: SegmentTree<[number, number?]>;
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
    this.hasSf = typeof source.getSf === "function";
    this.data = new Array(source.length);
    for (let i = 0; i < source.length; i++) {
      const ny = source.getNy(i);
      const sf = this.hasSf ? source.getSf!(i) : undefined;
      this.data[i] = [ny, sf];
    }
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(source.startTime, source.startTime + source.timeStep),
    );
    this.idxShift = betweenTBasesAR1(new AR1Basis(1, 2), bUnit);
    // bIndexFull represents the full range of data indices and remains constant
    // since append() maintains a sliding window of fixed length
    this.bIndexFull = new AR1Basis(0, this.data.length - 1);
    this.rebuildSegmentTrees();
  }

  append(ny: number, sf?: number): void {
    if (!this.hasSf && sf !== undefined) {
      console.warn(
        "ChartData: sf parameter provided but chart was initialized without getSf function. sf value will be ignored.",
      );
    }
    this.data.push([ny, this.hasSf ? sf : undefined]);
    this.data.shift();
    this.idxToTime = this.idxToTime.composeWith(this.idxShift);
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
    const clamped = Math.min(
      Math.max(Math.round(idx), 0),
      this.data.length - 1,
    );
    const [ny, sf] = this.data[clamped];
    return {
      ny,
      sf,
      timestamp: this.idxToTime.applyToPoint(clamped),
    };
  }

  private rebuildSegmentTrees(): void {
    this.treeNy = new SegmentTree(this.data, this.data.length, (i, arr) => {
      const val = arr[i][0];
      const minVal = isNaN(val) ? Infinity : val;
      const maxVal = isNaN(val) ? -Infinity : val;
      return { min: minVal, max: maxVal } as IMinMax;
    });
    this.treeSf = this.hasSf
      ? new SegmentTree(this.data, this.data.length, (i, arr) => {
          const val = arr[i][1]!;
          const minVal = isNaN(val) ? Infinity : val;
          const maxVal = isNaN(val) ? -Infinity : val;
          return { min: minVal, max: maxVal } as IMinMax;
        })
      : undefined;
  }

  bTemperatureVisible(
    bIndexVisible: AR1Basis,
    tree: SegmentTree<[number, number?]>,
  ): AR1Basis {
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    let startIdx = Math.floor(minIdxX);
    let endIdx = Math.ceil(maxIdxX);
    const lastIdx = this.data.length - 1;
    startIdx = Math.min(Math.max(startIdx, 0), lastIdx);
    endIdx = Math.min(Math.max(endIdx, 0), lastIdx);
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
