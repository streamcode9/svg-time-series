export class SlidingWindow {
  public readonly data: number[][];
  public startIndex = 0;
  public readonly seriesCount: number;

  constructor(initialData: number[][]) {
    if (initialData.length === 0) {
      throw new Error("SlidingWindow requires a non-empty data array");
    }
    this.data = initialData;
    this.seriesCount = initialData[0].length;
  }

  append(...values: number[]): void {
    if (values.length !== this.seriesCount) {
      throw new Error(
        `SlidingWindow.append requires ${this.seriesCount} values, received ${values.length}`,
      );
    }
    let valueIdx = 0;
    for (const val of values) {
      if (val == null || !Number.isFinite(val)) {
        throw new Error(
          `SlidingWindow.append requires series ${valueIdx} value to be a finite number`,
        );
      }
      valueIdx++;
    }
    this.data.push(values);
    this.data.shift();
    this.startIndex++;
  }

  get length(): number {
    return this.data.length;
  }
}
