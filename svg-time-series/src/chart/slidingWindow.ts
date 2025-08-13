export class SlidingWindow {
  public readonly data: number[][];
  public startIndex = 0;
  public readonly seriesCount: number;

  constructor(initialData: number[][]) {
    if (initialData.length === 0) {
      throw new Error("SlidingWindow requires a non-empty data array");
    }
    this.seriesCount = initialData[0]!.length;
    initialData.forEach((row, rowIdx) => {
      this.validateValues(row, rowIdx);
    });
    this.data = initialData;
  }

  append(...values: number[]): void {
    this.validateValues(values);
    this.data.push(values);
    this.data.shift();
    this.startIndex++;
  }

  get length(): number {
    return this.data.length;
  }

  private validateValues(row: number[], rowIdx?: number): void {
    if (row.length !== this.seriesCount) {
      if (rowIdx === undefined) {
        throw new Error(
          `SlidingWindow.append requires ${String(
            this.seriesCount,
          )} values, received ${String(row.length)}`,
        );
      }
      throw new Error(
        `SlidingWindow requires row ${String(rowIdx)} to have ${String(
          this.seriesCount,
        )} values, received ${String(row.length)}`,
      );
    }
    row.forEach((val, valueIdx) => {
      if (!Number.isFinite(val) && !Number.isNaN(val)) {
        if (rowIdx === undefined) {
          throw new Error(
            `SlidingWindow.append requires series ${String(
              valueIdx,
            )} value to be a finite number or NaN`,
          );
        }
        throw new Error(
          `SlidingWindow requires row ${String(rowIdx)} series ${String(
            valueIdx,
          )} value to be a finite number or NaN`,
        );
      }
    });
  }
}
