import { describe, it, expect } from "vitest";
import { ChartData } from "./data.ts";
import { AR1Basis } from "../math/affine.ts";

describe("ChartData", () => {
  const buildNy = (i: number, arr: ReadonlyArray<[number, number?]>) => ({
    min: arr[i][0],
    max: arr[i][0],
  });
  const buildSf = (i: number, arr: ReadonlyArray<[number, number?]>) => ({
    min: arr[i][1]!,
    max: arr[i][1]!,
  });

  it("throws if constructed with empty data", () => {
    expect(() => new ChartData(0, 1, [], buildNy)).toThrow(
      /non-empty data array/,
    );
  });

  it("updates data and time mapping on append", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [0, 0],
        [1, 1],
      ],
      buildNy,
      buildSf,
    );
    expect(cd.data).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(cd.idxToTime.applyToPoint(0)).toBe(0);

    cd.append([2, 2]);

    expect(cd.data).toEqual([
      [1, 1],
      [2, 2],
    ]);
    // appending shifts the index-to-time mapping one step backward
    expect(cd.idxToTime.applyToPoint(0)).toBe(-1);
    expect(cd.idxToTime.applyToPoint(1)).toBe(0);
  });

  it("reflects latest window after multiple appends", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [0, 0],
        [1, 1],
      ],
      buildNy,
      buildSf,
    );

    cd.append([2, 2]);
    cd.append([3, 3]);
    cd.append([4, 4]);

    expect(cd.data).toEqual([
      [3, 3],
      [4, 4],
    ]);
    expect(cd.idxToTime.applyToPoint(0)).toBe(-3);
    expect(cd.idxToTime.applyToPoint(1)).toBe(-2);
    expect(cd.treeNy.getMinMax(0, 1)).toEqual({ min: 3, max: 4 });
    expect(cd.treeSf!.getMinMax(0, 1)).toEqual({ min: 3, max: 4 });
  });

  it("computes visible temperature bounds", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
      buildNy,
      buildSf,
    );
    const range = new AR1Basis(0, 2);
    expect(cd.bTemperatureVisible(range, cd.treeNy).toArr()).toEqual([10, 50]);
    expect(cd.bTemperatureVisible(range, cd.treeSf!).toArr()).toEqual([20, 60]);
  });

  it("floors and ceils fractional bounds when computing temperature visibility", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
      buildNy,
      buildSf,
    );

    const fractionalRange = new AR1Basis(0.49, 1.49);
    expect(cd.bTemperatureVisible(fractionalRange, cd.treeNy).toArr()).toEqual([
      10, 50,
    ]);
    expect(cd.bTemperatureVisible(fractionalRange, cd.treeSf!).toArr()).toEqual(
      [20, 60],
    );
  });

  it("handles fractional bounds in the middle of the dataset", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
      buildNy,
      buildSf,
    );

    const fractionalRange = new AR1Basis(1.1, 1.7);
    expect(cd.bTemperatureVisible(fractionalRange, cd.treeNy).toArr()).toEqual([
      30, 50,
    ]);
    expect(cd.bTemperatureVisible(fractionalRange, cd.treeSf!).toArr()).toEqual(
      [40, 60],
    );
  });

  it("clamps bounds that extend past the data range", () => {
    const cd = new ChartData(
      0,
      1,
      [
        [10, 20],
        [30, 40],
        [50, 60],
      ],
      buildNy,
      buildSf,
    );

    const outOfRange = new AR1Basis(-0.5, 3.5);
    expect(() => cd.bTemperatureVisible(outOfRange, cd.treeNy)).not.toThrow();
    expect(() => cd.bTemperatureVisible(outOfRange, cd.treeSf!)).not.toThrow();
    expect(cd.bTemperatureVisible(outOfRange, cd.treeNy).toArr()).toEqual([
      10, 50,
    ]);
    expect(cd.bTemperatureVisible(outOfRange, cd.treeSf!).toArr()).toEqual([
      20, 60,
    ]);
  });

  describe("single-axis", () => {
    const buildNy = (i: number, arr: ReadonlyArray<[number, number?]>) => ({
      min: arr[i][0],
      max: arr[i][0],
    });

    it("handles data without second series", () => {
      const cd = new ChartData(0, 1, [[0], [1]], buildNy);
      expect(cd.treeSf).toBeUndefined();
      expect(cd.data).toEqual([[0], [1]]);
      cd.append([2]);
      expect(cd.data).toEqual([[1], [2]]);
      expect(cd.treeNy.getMinMax(0, 1)).toEqual({ min: 1, max: 2 });
    });
  });
});
