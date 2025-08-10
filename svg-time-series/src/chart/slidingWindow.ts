export class SlidingWindow {
  public readonly data: number[][];
  public startIndex = 0;
  public readonly seriesCount: number;

  constructor(initialData: number[][]) {
    if (initialData.length === 0) {
      throw new Error("SlidingWindow requires a non-empty data array");
    }
    const seriesCount = initialData[0]!.length;
    initialData.forEach((row, rowIdx) => {
      if (row.length !== seriesCount) {
        throw new Error(
          `SlidingWindow requires row ${String(rowIdx)} to have ${String(
            seriesCount,
          )} values, received ${String(row.length)}`,
        );
      }
      let valueIdx = 0;
      for (const val of row) {
        if (!Number.isFinite(val) && !Number.isNaN(val)) {
          throw new Error(
            `SlidingWindow requires row ${String(rowIdx)} series ${String(
              valueIdx,
            )} value to be a finite number or NaN`,
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
        `SlidingWindow.append requires ${String(
          this.seriesCount,
        )} values, received ${String(values.length)}`,
      );
    }
    let valueIdx = 0;
    for (const val of values) {
      if (!Number.isFinite(val) && !Number.isNaN(val)) {
        throw new Error(
          `SlidingWindow.append requires series ${String(
            valueIdx,
          )} value to be a finite number or NaN`,
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
