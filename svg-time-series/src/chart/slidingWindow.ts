function formatLengthError(
  seriesCount: number,
  rowLength: number,
  rowIdx?: number,
): string {
  if (rowIdx === undefined) {
    return `SlidingWindow.append requires ${String(
      seriesCount,
    )} values, received ${String(rowLength)}`;
  }
  return `SlidingWindow requires row ${String(rowIdx)} to have ${String(
    seriesCount,
  )} values, received ${String(rowLength)}`;
}

function formatValueError(valueIdx: number, rowIdx?: number): string {
  if (rowIdx === undefined) {
    return `SlidingWindow.append requires series ${String(
      valueIdx,
    )} value to be a finite number or NaN`;
  }
  return `SlidingWindow requires row ${String(rowIdx)} series ${String(
    valueIdx,
  )} value to be a finite number or NaN`;
}

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
      throw new Error(formatLengthError(this.seriesCount, row.length, rowIdx));
    }
    row.forEach((val, valueIdx) => {
      if (!Number.isFinite(val) && !Number.isNaN(val)) {
        throw new Error(formatValueError(valueIdx, rowIdx));
      }
    });
  }
}
