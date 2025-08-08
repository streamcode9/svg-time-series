import { describe, it, expect, vi } from "vitest";
import { ChartData, IDataSource } from "./data.ts";
import { AR1Basis } from "../math/affine.ts";

describe("ChartData", () => {
  const makeSource = (data: Array<[number, number?]>): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: data.some((d) => d[1] !== undefined) ? 2 : 1,
    getSeries: (i, seriesIdx) => data[i][seriesIdx]!,
  });

  it("throws if constructed with empty data", () => {
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 0,
      seriesCount: 1,
      getSeries: () => 0,
    };
    expect(() => new ChartData(source)).toThrow(/non-empty data array/);
  });

  it("throws if seriesCount is not 1 or 2", () => {
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 1,
      seriesCount: 3,
      getSeries: () => 0,
    };
    expect(() => new ChartData(source)).toThrow(/1 or 2 series/);
  });

  it("updates data and time mapping on append", () => {
    const source = makeSource([
      [0, 0],
      [1, 1],
    ]);
    const cd = new ChartData(source);
    expect(cd.data).toEqual([
      [0, 0],
      [1, 1],
    ]);
    expect(cd.getPoint(0).timestamp).toBe(0);

    cd.append(2, 2);

    expect(cd.data).toEqual([
      [1, 1],
      [2, 2],
    ]);
    // appending shifts the index-to-time mapping one step forward
    expect(cd.getPoint(0).timestamp).toBe(1);
    expect(cd.getPoint(1).timestamp).toBe(2);
  });

  it("provides clamped point data and timestamp", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );
    expect(cd.getPoint(1)).toEqual({ ny: 30, sf: 40, timestamp: 1 });
    expect(cd.getPoint(10)).toEqual({ ny: 50, sf: 60, timestamp: 2 });
    expect(cd.getPoint(-5)).toEqual({ ny: 10, sf: 20, timestamp: 0 });
  });

  it("throws when index is not finite", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );
    expect(() => cd.getPoint(NaN)).toThrow(/idx/);
    expect(() => cd.getPoint(Infinity)).toThrow(/idx/);
    expect(() => cd.getPoint(-Infinity)).toThrow(/idx/);
  });

  it("clamps extreme out-of-range indices", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );
    expect(cd.getPoint(1_000_000)).toEqual({
      ny: 50,
      sf: 60,
      timestamp: 2,
    });
    expect(cd.getPoint(-1_000_000)).toEqual({
      ny: 10,
      sf: 20,
      timestamp: 0,
    });
  });

  it("reflects latest window after multiple appends", () => {
    const cd = new ChartData(
      makeSource([
        [0, 0],
        [1, 1],
      ]),
    );

    cd.append(2, 2);
    cd.append(3, 3);
    cd.append(4, 4);

    expect(cd.data).toEqual([
      [3, 3],
      [4, 4],
    ]);
    expect(cd.getPoint(0).timestamp).toBe(3);
    expect(cd.getPoint(1).timestamp).toBe(4);
    expect(cd.treeNy.query(0, 1)).toEqual({ min: 3, max: 4 });
    expect(cd.treeSf!.query(0, 1)).toEqual({ min: 3, max: 4 });
  });

  it("throws when ny is invalid", () => {
    const source = makeSource([
      [0, 0],
      [1, 1],
    ]);
    const cd = new ChartData(source);
    expect(() => cd.append(undefined as unknown as number, 2)).toThrow(/ny/);
  });

  it("throws when sf is invalid", () => {
    const source = makeSource([
      [0, 0],
      [1, 1],
    ]);
    const cd = new ChartData(source);
    expect(() => cd.append(2, undefined as unknown as number)).toThrow(/sf/);
  });

  it("computes visible temperature bounds", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );
    const range = new AR1Basis(0, 2);
    expect(cd.bTemperatureVisible(range, cd.treeNy).toArr()).toEqual([10, 50]);
    expect(cd.bTemperatureVisible(range, cd.treeSf!).toArr()).toEqual([20, 60]);
  });

  it("floors and ceils fractional bounds when computing temperature visibility", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
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
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
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
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
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

  it("clamps bounds completely to the left of the data range", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );

    const leftRange = new AR1Basis(-5, -1);
    expect(() => cd.bTemperatureVisible(leftRange, cd.treeNy)).not.toThrow();
    expect(() => cd.bTemperatureVisible(leftRange, cd.treeSf!)).not.toThrow();
    expect(cd.bTemperatureVisible(leftRange, cd.treeNy).toArr()).toEqual([
      10, 10,
    ]);
    expect(cd.bTemperatureVisible(leftRange, cd.treeSf!).toArr()).toEqual([
      20, 20,
    ]);
  });

  it("clamps bounds completely to the right of the data range", () => {
    const cd = new ChartData(
      makeSource([
        [10, 20],
        [30, 40],
        [50, 60],
      ]),
    );

    const rightRange = new AR1Basis(5, 10);
    expect(() => cd.bTemperatureVisible(rightRange, cd.treeNy)).not.toThrow();
    expect(() => cd.bTemperatureVisible(rightRange, cd.treeSf!)).not.toThrow();
    expect(cd.bTemperatureVisible(rightRange, cd.treeNy).toArr()).toEqual([
      50, 50,
    ]);
    expect(cd.bTemperatureVisible(rightRange, cd.treeSf!).toArr()).toEqual([
      60, 60,
    ]);
  });

  it("computes combined temperature basis and direct product", () => {
    const cd = new ChartData(
      makeSource([
        [0, 10],
        [5, 2],
        [-3, 7],
      ]),
    );
    const { combined, dp } = cd.combinedTemperatureDp(cd.bIndexFull);
    expect(combined.toArr()).toEqual([-3, 10]);
    expect(dp.x().toArr()).toEqual([0, 2]);
    expect(dp.y().toArr()).toEqual([-3, 10]);
  });

  it("returns neutral min/max when both series are all NaN", () => {
    const cd = new ChartData(
      makeSource([
        [NaN, NaN],
        [NaN, NaN],
      ]),
    );
    const range = new AR1Basis(0, 1);
    expect(cd.treeNy.query(0, 1)).toEqual({ min: 0, max: 0 });
    expect(cd.treeSf!.query(0, 1)).toEqual({ min: 0, max: 0 });
    expect(cd.bTemperatureVisible(range, cd.treeNy).toArr()).toEqual([0, 0]);
    expect(cd.bTemperatureVisible(range, cd.treeSf!).toArr()).toEqual([0, 0]);
  });

  describe("single-axis", () => {
    it("handles data without second series", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 2,
        seriesCount: 1,
        getSeries: (i) => [0, 1][i],
      };
      const cd = new ChartData(source);
      expect(cd.treeSf).toBeUndefined();
      expect(cd.data).toEqual([
        [0, undefined],
        [1, undefined],
      ]);
      cd.append(2);
      expect(cd.data).toEqual([
        [1, undefined],
        [2, undefined],
      ]);
      expect(cd.treeNy.query(0, 1)).toEqual({ min: 1, max: 2 });
    });

    it("ignores provided sf when single-axis", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 1,
        seriesCount: 1,
        getSeries: (i) => [0][i],
      };
      const cd = new ChartData(source);
      expect(() => cd.append(1)).not.toThrow();
      expect(cd.data).toEqual([[1, undefined]]);
    });

    it("returns neutral min/max when data is all NaN", () => {
      const cd = new ChartData(makeSource([[NaN], [NaN]]));
      const range = new AR1Basis(0, 1);
      expect(cd.treeNy.query(0, 1)).toEqual({ min: 0, max: 0 });
      expect(cd.bTemperatureVisible(range, cd.treeNy).toArr()).toEqual([0, 0]);
    });
  });
});
