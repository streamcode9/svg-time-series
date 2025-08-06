export type Operator<T> = (a: T, b: T) => T;

export class SegmentTreeHalf<T> {
  private size: number;
  private tree: T[];
  private op: Operator<T>;
  private identity: T;

  constructor(data: T[], op: Operator<T>, identity: T) {
    this.size = data.length;
    this.tree = new Array(this.size * 2);
    this.op = op;
    this.identity = identity;

    // Build the tree
    for (let i = 0; i < this.size; i++) {
      this.tree[this.size + i] = data[i];
    }
    for (let i = this.size - 1; i > 0; i--) {
      this.tree[i] = this.op(this.tree[i * 2], this.tree[i * 2 + 1]);
    }
  }

  update(index: number, value: T): void {
    let i = index + this.size;
    this.tree[i] = value;
    while (i > 1) {
      i = Math.floor(i / 2);
      this.tree[i] = this.op(this.tree[i * 2], this.tree[i * 2 + 1]);
    }
  }

  query(left: number, right: number): T {
    if (left < 0 || right >= this.size || left > right) {
      throw new Error("Range is not valid");
    }
    left += this.size;
    right += this.size;
    let result = this.identity;

    while (left < right) {
      if (left % 2 === 1) {
        result = this.op(result, this.tree[left]);
        left++;
      }
      if (right % 2 === 0) {
        result = this.op(result, this.tree[right]);
        right--;
      }
      left = Math.floor(left / 2);
      right = Math.floor(right / 2);
    }

    if (left === right) {
      result = this.op(result, this.tree[left]);
    }

    return result;
  }
}
