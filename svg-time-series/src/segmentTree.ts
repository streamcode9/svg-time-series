import { SegmentTreeHalf } from './segmentTreeHalf';

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

function buildMinMax(fst: Readonly<IMinMax>, snd: Readonly<IMinMax>): IMinMax {
  return { min: Math.min(fst.min, snd.min), max: Math.max(fst.max, snd.max) } as const;
}

const minMaxIdentity: IMinMax = {
  min: Infinity,
  max: -Infinity
};

function assertOk(cond: boolean, message: string): asserts cond {
  if (!cond) {
    throw new Error(message);
  }
}

export class SegmentTree<T = [number, number]> {
  private readonly size: number;
  private tree: SegmentTreeHalf<IMinMax>;

  constructor(
    data: ReadonlyArray<T>,
    dataSize: number,
    buildTuple: (elementIndex: number, elements: ReadonlyArray<T>) => IMinMax,
  ) {
    this.size = dataSize;
    const minMaxData: IMinMax[] = new Array(this.size);

    for (let i = 0; i < this.size; i++) {
      minMaxData[i] = buildTuple(i, data);
    }

    this.tree = new SegmentTreeHalf(minMaxData, buildMinMax, minMaxIdentity);
  }

  getMinMax(fromPosition: number, toPosition: number): IMinMax {
    assertOk(
      fromPosition >= 0 && toPosition < this.size && fromPosition <= toPosition,
      "Range is not valid",
    );
    return this.tree.query(fromPosition, toPosition);
  }

  update(positionToUpdate: number, newValue: Readonly<IMinMax>): void {
    assertOk(
      positionToUpdate >= 0 && positionToUpdate < this.size,
      "Position is not valid",
    );

    this.tree.update(positionToUpdate, newValue);
  }
}
