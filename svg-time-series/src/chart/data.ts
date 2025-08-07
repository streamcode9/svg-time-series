import {
  AR1,
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
  bUnit,
} from "../math/affine.ts";
import { IMinMax, SegmentTree } from "../segmentTree.ts";

export type { IMinMax };

export class ChartData {
  public data: Array<[number, number?]>;
  public treeNy!: SegmentTree<[number, number?]>;
  public treeSf?: SegmentTree<[number, number?]>;
  public idxToTime: AR1;
  private idxShift: AR1;
  public bIndexFull: AR1Basis;
  private buildSegmentTreeTupleNy: (
    index: number,
    elements: ReadonlyArray<[number, number?]>,
  ) => IMinMax;
  private buildSegmentTreeTupleSf?: (
    index: number,
    elements: ReadonlyArray<[number, number?]>,
  ) => IMinMax;

  /**
   * Creates a new ChartData instance.
   * @param data Initial dataset; must contain at least one point.
   * @throws if `data` is empty.
   */
  constructor(
    startTime: number,
    timeStep: number,
    data: Array<[number, number?]>,
    buildSegmentTreeTupleNy: (
      index: number,
      elements: ReadonlyArray<[number, number?]>,
    ) => IMinMax,
    buildSegmentTreeTupleSf?: (
      index: number,
      elements: ReadonlyArray<[number, number?]>,
    ) => IMinMax,
  ) {
    if (data.length === 0) {
      throw new Error("ChartData requires a non-empty data array");
    }
    this.data = data;
    this.buildSegmentTreeTupleNy = buildSegmentTreeTupleNy;
    this.buildSegmentTreeTupleSf = buildSegmentTreeTupleSf;
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(startTime, startTime + timeStep),
    );
    this.idxShift = betweenTBasesAR1(new AR1Basis(1, 2), bUnit);
    this.bIndexFull = new AR1Basis(0, data.length - 1);
    this.rebuildSegmentTrees();
  }

  append(newData: [number, number?]): void {
    this.data.push(newData);
    this.data.shift();
    this.idxToTime = this.idxToTime.composeWith(this.idxShift);
    this.rebuildSegmentTrees();
  }

  private rebuildSegmentTrees(): void {
    this.treeNy = new SegmentTree(
      this.data,
      this.data.length,
      this.buildSegmentTreeTupleNy,
    );
    this.treeSf = this.buildSegmentTreeTupleSf
      ? new SegmentTree(
          this.data,
          this.data.length,
          this.buildSegmentTreeTupleSf,
        )
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
