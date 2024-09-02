export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

function buildMinMax(fst: Readonly<IMinMax>, snd: Readonly<IMinMax>): IMinMax {
  return { min: Math.min(fst.min, snd.min), max: Math.max(fst.max, snd.max) } as const;
}

function assertOk(cond: boolean, message: string): asserts cond {
  if (!cond) {
    throw new Error(message);
  }
}

export class SegmentTree<T = any> {
  private readonly size: number;
  private readonly tree: IMinMax[];
  private readonly buildTuple: (elementIndex: number, elements: ReadonlyArray<T>) => IMinMax;

  constructor(
    data: ReadonlyArray<T>,
    dataSize: number,
    buildTuple: (elementIndex: number, elements: ReadonlyArray<T>) => IMinMax,
  ) {
    this.size = dataSize;
    this.tree = new Array(this.size * 4);
    this.buildTuple = buildTuple;

    const build = (
      tree: IMinMax[],
      values: ReadonlyArray<T>,
      i: number,
      left: number,
      right: number,
    ): void => {
      if (left === right) {
        tree[i] = this.buildTuple(left, values);
      } else {
        const middle = Math.floor((left + right) / 2);
        build(tree, values, 2 * i, left, middle);
        build(tree, values, 2 * i + 1, middle + 1, right);
        tree[i] = buildMinMax(tree[2 * i], tree[2 * i + 1]);
      }
    };
    build(this.tree, data, 1, 0, this.size - 1);
  }

  getMinMax(fromPosition: number, toPosition: number): IMinMax {
    assertOk(
      fromPosition >= 0 && toPosition <= this.size,
      "Range is not valid",
    );
    const getMinMax = (
      tree: ReadonlyArray<IMinMax>,
      i: number,
      left: number,
      right: number,
      from: number,
      to: number,
    ): IMinMax => {
      if (from > to) {
        return { min: Infinity, max: -Infinity } as const;
      }
      if (from === left && to === right) {
        return tree[i];
      }
      const middle = Math.floor((left + right) / 2);
      return buildMinMax(
        getMinMax(tree, i * 2, left, middle, from, Math.min(to, middle)),
        getMinMax(
          tree,
          i * 2 + 1,
          middle + 1,
          right,
          Math.max(from, middle + 1),
          to,
        ),
      );
    };
    return getMinMax(this.tree, 1, 0, this.size - 1, fromPosition, toPosition);
  }

  update(positionToUpdate: number, newValue: Readonly<IMinMax>): void {
    const update = (
      tree: IMinMax[],
      i: number,
      left: number,
      right: number,
      position: number,
      newTuple: Readonly<IMinMax>,
    ): void => {
      if (left === right) {
        tree[i] = newTuple;
        return;
      }

      const middle = Math.floor((left + right) / 2);
      if (position <= middle) {
        update(tree, i * 2, left, middle, position, newTuple);
      } else {
        update(tree, i * 2 + 1, middle + 1, right, position, newTuple);
      }
      tree[i] = buildMinMax(tree[i * 2], tree[i * 2 + 1]);
    };
    update(this.tree, 1, 0, this.size - 1, positionToUpdate, newValue);
  }
}
