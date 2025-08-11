export type Operator<T> = (a: T, b: T) => T;

export class SegmentTree<T> {
  private size: number;
  private tree: T[];
  private op: Operator<T>;
  private identity: T;

  private assertValidIndex(i: number): void {
    if (!Number.isInteger(i)) {
      throw new Error("Index must be an integer");
    }
    if (i < 0 || i >= this.size) {
      throw new Error("Index is out of range");
    }
  }

  /**
   * Creates a new segment tree.
   *
   * @param data - Initial array to build the tree from. Must contain at least one element.
   * @param op - The associative operator used for combining values.
   * @param identity - Identity value for the operator.
   * @throws {Error} If `data` is empty.
   */
  constructor(data: T[], op: Operator<T>, identity: T) {
    if (data.length === 0) {
      throw new Error("Data array must contain at least one element");
    }
    this.size = data.length;
    this.tree = new Array<T>(this.size << 1);
    this.op = op;
    this.identity = identity;

    for (let i = 0; i < this.size; i++) {
      this.tree[this.size + i] = data[i]!;
    }
    for (let i = this.size - 1; i > 0; i--) {
      this.tree[i] = this.op(this.tree[i << 1]!, this.tree[(i << 1) | 1]!);
    }
  }

  update(index: number, value: T): void {
    this.assertValidIndex(index);
    let i = index + this.size;
    this.tree[i] = value;
    while (i > 1) {
      i >>= 1;
      this.tree[i] = this.op(this.tree[i << 1]!, this.tree[(i << 1) | 1]!);
    }
  }

  query(left: number, right: number): T {
    this.assertValidIndex(left);
    this.assertValidIndex(right);
    if (left > right) {
      throw new Error("Range is not valid");
    }
    left += this.size;
    right += this.size;
    let result = this.identity;

    while (left < right) {
      if (left & 1) {
        result = this.op(result, this.tree[left]!);
        left++;
      }
      if (!(right & 1)) {
        result = this.op(result, this.tree[right]!);
        right--;
      }
      left >>= 1;
      right >>= 1;
    }

    if (left === right) {
      result = this.op(result, this.tree[left]!);
    }

    return result;
  }
}
