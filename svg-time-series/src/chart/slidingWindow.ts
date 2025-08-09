export class SlidingWindow {
  public readonly data: number[][];
  public startIndex = 0;
  public readonly seriesCount: number;

  constructor(initialData: number[][]) {
    if (initialData.length === 0) {
      throw new Error("SlidingWindow requires a non-empty data array");
    }
    const seriesCount = initialData[0].length;
    initialData.forEach((row, rowIdx) => {
      if (row.length !== seriesCount) {
        throw new Error(
          `SlidingWindow requires row ${rowIdx} to have ${seriesCount} values, received ${row.length}`,
        );
      }
      let valueIdx = 0;
      for (const val of row) {
        if (!Number.isFinite(val) && !Number.isNaN(val)) {
          throw new Error(
            `SlidingWindow requires row ${rowIdx} series ${valueIdx} value to be a finite number or NaN`,
          );
        }
        valueIdx++;
      }
    });
    this.data = initialData;
    this.seriesCount = seriesCount;
  }

  append(...values: number[]): void {
    if (values.length !== this.seriesCount) {
      throw new Error(
        `SlidingWindow.append requires ${this.seriesCount} values, received ${values.length}`,
      );
    }
    let valueIdx = 0;
    for (const val of values) {
      if (!Number.isFinite(val) && !Number.isNaN(val)) {
        throw new Error(
          `SlidingWindow.append requires series ${valueIdx} value to be a finite number or NaN`,
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
