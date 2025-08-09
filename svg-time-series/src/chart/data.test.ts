import { describe, it, expect } from "vitest";
import { ChartData, IDataSource } from "./data.ts";
import { AR1Basis } from "../math/affine.ts";
/* eslint-disable @typescript-eslint/no-non-null-assertion */

describe("ChartData", () => {
  const makeSource = (data: number[][], seriesAxes: number[]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: data[0]?.length ?? 0,
    getSeries: (i, seriesIdx) => data[i][seriesIdx]!,
    seriesAxes,
  });

  it("throws if constructed with empty data", () => {
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 0,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData(source)).toThrow(/non-empty data array/);
  });

  it("throws when seriesAxes length does not match seriesCount", () => {
    const source = makeSource(
      [
        [0, 0],
        [1, 1],
      ],
      [0],
    );
    expect(() => new ChartData(source)).toThrow(/seriesAxes length/);
  });

  it("throws when seriesAxes contains unsupported axis index", () => {
    const source = makeSource(
      [
        [0, 0],
        [1, 1],
      ],
      [0, 2],
    );
    expect(() => new ChartData(source)).toThrow(/0 or 1/);
  });

  it("updates data and time mapping on append", () => {
    const source = makeSource(
      [
        [0, 0],
        [1, 1],
      ],
      [0, 1],
    );
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
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );
    expect(cd.getPoint(1)).toEqual({ values: [30, 40], timestamp: 1 });
    expect(cd.getPoint(10)).toEqual({ values: [50, 60], timestamp: 2 });
    expect(cd.getPoint(-5)).toEqual({ values: [10, 20], timestamp: 0 });
  });

  it("throws when index is not finite", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );
    expect(() => cd.getPoint(NaN)).toThrow(/idx/);
    expect(() => cd.getPoint(Infinity)).toThrow(/idx/);
    expect(() => cd.getPoint(-Infinity)).toThrow(/idx/);
  });

  it("clamps extreme out-of-range indices", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );
    expect(cd.getPoint(1_000_000)).toEqual({
      values: [50, 60],
      timestamp: 2,
    });
    expect(cd.getPoint(-1_000_000)).toEqual({
      values: [10, 20],
      timestamp: 0,
    });
  });

  it("reflects latest window after multiple appends", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 0],
          [1, 1],
        ],
        [0, 1],
      ),
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
    expect(cd.treeAxis0.query(0, 1)).toEqual({ min: 3, max: 4 });
    expect(cd.treeAxis1!.query(0, 1)).toEqual({ min: 3, max: 4 });
  });

  it("throws when ny is invalid", () => {
    const source = makeSource(
      [
        [0, 0],
        [1, 1],
      ],
      [0, 1],
    );
    const cd = new ChartData(source);
    expect(() => cd.append(undefined as unknown as number, 2)).toThrow(
      /series 0/,
    );
  });

  it("throws when sf is invalid", () => {
    const source = makeSource(
      [
        [0, 0],
        [1, 1],
      ],
      [0, 1],
    );
    const cd = new ChartData(source);
    expect(() => cd.append(2, undefined as unknown as number)).toThrow(
      /series 1/,
    );
  });

  it("computes visible temperature bounds", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );
    const range = new AR1Basis(0, 2);
    expect(cd.bAxisVisible(range, 0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(range, 1).toArr()).toEqual([20, 60]);
  });

  it("floors and ceils fractional bounds when computing temperature visibility", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );

    const fractionalRange = new AR1Basis(0.49, 1.49);
    expect(cd.bAxisVisible(fractionalRange, 0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(fractionalRange, 1).toArr()).toEqual([20, 60]);
  });

  it("handles fractional bounds in the middle of the dataset", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );

    const fractionalRange = new AR1Basis(1.1, 1.7);
    expect(cd.bAxisVisible(fractionalRange, 0).toArr()).toEqual([30, 50]);
    expect(cd.bAxisVisible(fractionalRange, 1).toArr()).toEqual([40, 60]);
  });

  it("clamps bounds that extend past the data range", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );

    const outOfRange = new AR1Basis(-0.5, 3.5);
    expect(() => cd.bAxisVisible(outOfRange, 0)).not.toThrow();
    expect(() => cd.bAxisVisible(outOfRange, 1)).not.toThrow();
    expect(cd.bAxisVisible(outOfRange, 0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(outOfRange, 1).toArr()).toEqual([20, 60]);
  });

  it("clamps bounds completely to the left of the data range", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );

    const leftRange = new AR1Basis(-5, -1);
    expect(() => cd.bAxisVisible(leftRange, 0)).not.toThrow();
    expect(() => cd.bAxisVisible(leftRange, 1)).not.toThrow();
    expect(cd.bAxisVisible(leftRange, 0).toArr()).toEqual([10, 10]);
    expect(cd.bAxisVisible(leftRange, 1).toArr()).toEqual([20, 20]);
  });

  it("clamps bounds completely to the right of the data range", () => {
    const cd = new ChartData(
      makeSource(
        [
          [10, 20],
          [30, 40],
          [50, 60],
        ],
        [0, 1],
      ),
    );

    const rightRange = new AR1Basis(5, 10);
    expect(() => cd.bAxisVisible(rightRange, 0)).not.toThrow();
    expect(() => cd.bAxisVisible(rightRange, 1)).not.toThrow();
    expect(cd.bAxisVisible(rightRange, 0).toArr()).toEqual([50, 50]);
    expect(cd.bAxisVisible(rightRange, 1).toArr()).toEqual([60, 60]);
  });

  it("computes combined temperature basis and direct product", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 10],
          [5, 2],
          [-3, 7],
        ],
        [0, 1],
      ),
    );
    const { combined, dp } = cd.combinedAxisDp(cd.bIndexFull);
    expect(combined.toArr()).toEqual([-3, 10]);
    expect(dp.x().toArr()).toEqual([0, 2]);
    expect(dp.y().toArr()).toEqual([-3, 10]);
  });

  it("returns Infinity/-Infinity min/max when both series are all NaN", () => {
    const cd = new ChartData(
      makeSource(
        [
          [NaN, NaN],
          [NaN, NaN],
        ],
        [0, 1],
      ),
    );
    const range = new AR1Basis(0, 1);
    expect(cd.treeAxis0.query(0, 1)).toEqual({ min: Infinity, max: -Infinity });
    expect(cd.treeAxis1!.query(0, 1)).toEqual({
      min: Infinity,
      max: -Infinity,
    });
    expect(cd.bAxisVisible(range, 0).toArr()).toEqual([Infinity, -Infinity]);
    expect(cd.bAxisVisible(range, 1).toArr()).toEqual([Infinity, -Infinity]);
  });

  it("ignores NaN values when computing min/max", () => {
    const cd = new ChartData(
      makeSource(
        [
          [NaN, NaN],
          [5, 3],
        ],
        [0, 1],
      ),
    );
    const range = new AR1Basis(0, 1);
    expect(cd.treeAxis0.query(0, 1)).toEqual({ min: 5, max: 5 });
    expect(cd.treeAxis1!.query(0, 1)).toEqual({ min: 3, max: 3 });
    expect(cd.bAxisVisible(range, 0).toArr()).toEqual([5, 5]);
    expect(cd.bAxisVisible(range, 1).toArr()).toEqual([3, 3]);
  });

  describe("single-axis", () => {
    it("handles data without second series", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 2,
        seriesCount: 1,
        getSeries: (i) => [0, 1][i],
        seriesAxes: [0],
      };
      const cd = new ChartData(source);
      expect(cd.treeAxis1).toBeUndefined();
      expect(cd.data).toEqual([[0], [1]]);
      cd.append(2);
      expect(cd.data).toEqual([[1], [2]]);
      expect(cd.treeAxis0.query(0, 1)).toEqual({ min: 1, max: 2 });
    });

    it("ignores provided sf when single-axis", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 1,
        seriesCount: 1,
        getSeries: (i) => [0][i],
        seriesAxes: [0],
      };
      const cd = new ChartData(source);
      expect(() => cd.append(1)).not.toThrow();
      expect(cd.data).toEqual([[1]]);
    });

    it("returns Infinity/-Infinity min/max when data is all NaN", () => {
      const cd = new ChartData(makeSource([[NaN], [NaN]], [0]));
      const range = new AR1Basis(0, 1);
      expect(cd.treeAxis0.query(0, 1)).toEqual({
        min: Infinity,
        max: -Infinity,
      });
      expect(cd.bAxisVisible(range, 0).toArr()).toEqual([Infinity, -Infinity]);
    });
  });

  it("aggregates segment trees per axis", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 10, 5, 100, 200],
          [1, 20, 15, 110, 220],
        ],
        [0, 0, 0, 1, 1],
      ),
    );
    expect(cd.trees).toHaveLength(2);
    expect(cd.treeAxis0.query(0, 1)).toEqual({ min: 0, max: 20 });
    expect(cd.treeAxis1!.query(0, 1)).toEqual({ min: 100, max: 220 });

    cd.append(2, 30, 25, 130, 230);
    expect(cd.data).toEqual([
      [1, 20, 15, 110, 220],
      [2, 30, 25, 130, 230],
    ]);
    expect(cd.treeAxis0.query(0, 1)).toEqual({ min: 1, max: 30 });
    expect(cd.treeAxis1!.query(0, 1)).toEqual({ min: 110, max: 230 });
    expect(cd.getPoint(1)).toEqual({
      values: [2, 30, 25, 130, 230],
      timestamp: 2,
    });
  });
});
