import { AR1, AR1Basis, betweenTBasesAR1, bUnit } from "../math/affine.ts";
import { IMinMax, SegmentTree } from "../segmentTree.ts";

export type { IMinMax };

export class ChartData {
  public data: Array<[number, number]>;
  public treeNy: SegmentTree;
  public treeSf: SegmentTree;
  public idxToTime: AR1;
  private idxShift: AR1;
  public bIndexFull: AR1Basis;
  private buildSegmentTreeTupleNy: (
    index: number,
    elements: ReadonlyArray<[number, number]>,
  ) => IMinMax;
  private buildSegmentTreeTupleSf: (
    index: number,
    elements: ReadonlyArray<[number, number]>,
  ) => IMinMax;

  constructor(
    startTime: number,
    timeStep: number,
    data: Array<[number, number]>,
    buildSegmentTreeTupleNy: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
    buildSegmentTreeTupleSf: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
  ) {
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

  append(newData: [number, number]): void {
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
    this.treeSf = new SegmentTree(
      this.data,
      this.data.length,
      this.buildSegmentTreeTupleSf,
    );
  }

  bTemperatureVisible(bIndexVisible: AR1Basis, tree: SegmentTree): AR1Basis {
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    const { min, max } = tree.getMinMax(
      Math.round(minIdxX),
      Math.round(maxIdxX),
    );
    return new AR1Basis(min, max);
  }
}
