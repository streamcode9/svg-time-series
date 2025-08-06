import { describe, it, expect } from "vitest";
import { ChartData } from "./data.ts";
import { AR1Basis } from "../math/affine.ts";

describe("ChartData", () => {
  const buildNy = (i: number, arr: Array<[number, number]>) => ({
    min: arr[i][0],
    max: arr[i][0],
  });
  const buildSf = (i: number, arr: Array<[number, number]>) => ({
    min: arr[i][1],
    max: arr[i][1],
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

    expect(cd.data).toEqual([
      [2, 2],
      [3, 3],
    ]);
    expect(cd.idxToTime.applyToPoint(0)).toBe(-2);
    expect(cd.idxToTime.applyToPoint(1)).toBe(-1);
    expect(cd.treeNy.getMinMax(0, 1)).toEqual({ min: 2, max: 3 });
    expect(cd.treeSf.getMinMax(0, 1)).toEqual({ min: 2, max: 3 });
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
    expect(cd.bTemperatureVisible(range, cd.treeSf).toArr()).toEqual([20, 60]);
  });

  it("rounds fractional bounds when computing temperature visibility", () => {
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
      10, 30,
    ]);
    expect(cd.bTemperatureVisible(fractionalRange, cd.treeSf).toArr()).toEqual([
      20, 40,
    ]);
  });
});
