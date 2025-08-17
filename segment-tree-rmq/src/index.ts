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

  private assertValidRange(start: number, end: number): void {
    this.assertValidIndex(start);
    this.assertValidIndex(end);
    if (start > end) {
      throw new Error("Range is not valid");
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

    data.forEach((value, i) => {
      this.tree[this.size + i] = value;
    });
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

  /**
   * Queries the range [start, endInclusive] in the tree.
   *
   * Both indices are zero-based and inclusive.
   *
   * @param start - Start index (inclusive).
   * @param endInclusive - End index (inclusive).
   */
  query(start: number, endInclusive: number): T {
    this.assertValidRange(start, endInclusive);
    // Move the indices to the leaf level. The right index is made exclusive
    // by adding 1 so the loop can naturally terminate when `left === right`.
    let left = start + this.size;
    let right = endInclusive + this.size + 1;
    let result = this.identity;

    // Traverse the tree upwards, shrinking the interval [left, right) until
    // there are no segments left to process.
    while (left < right) {
      // If `left` is a right child, it represents a disjoint segment that
      // should be included in the result. Move to the next segment after it.
      if (left & 1) {
        result = this.op(result, this.tree[left]!);
        left++;
      }
      // If `right` is a right boundary, the segment to the immediate left is
      // part of the range. Include it and shift the boundary left.
      if (right & 1) {
        right--;
        result = this.op(result, this.tree[right]!);
      }
      // Move both indices to their parents to continue with the next level.
      left >>= 1;
      right >>= 1;
    }

    return result;
  }
}
