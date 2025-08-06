import { SegmentTree as SegmentTreeCore } from "segment-tree-rmq";

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

export class SegmentTree<
  T = [number, number],
> extends SegmentTreeCore<IMinMax> {
  constructor(
    data: ReadonlyArray<T>,
    dataSize: number,
    buildTuple: (elementIndex: number, elements: ReadonlyArray<T>) => IMinMax,
  ) {
    const minMaxData: IMinMax[] = new Array(dataSize);

    for (let i = 0; i < dataSize; i++) {
      minMaxData[i] = buildTuple(i, data);
    }

    super(minMaxData, buildMinMax, minMaxIdentity);
  }
}
