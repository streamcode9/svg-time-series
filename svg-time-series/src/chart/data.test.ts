import { describe, it, expect } from "vitest";
import { AR1Basis } from "../math/affine.ts";
import type { IDataSource } from "./data.ts";
import { ChartData } from "./data.ts";

describe("ChartData", () => {
  const makeSource = (data: number[][], seriesAxes: number[]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: data[0]?.length ?? 0,
    getSeries: (i, seriesIdx) => data[i]![seriesIdx]!,
    seriesAxes,
  });

  it("throws when length is not a positive integer", () => {
    const base: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 1,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData({ ...base, length: 0 })).toThrow(
      /length.*positive integer/,
    );
    expect(() => new ChartData({ ...base, length: -1 })).toThrow(
      /length.*positive integer/,
    );
    expect(() => new ChartData({ ...base, length: 1.5 })).toThrow(
      /length.*positive integer/,
    );
  });

  it("throws when seriesCount is not a positive integer", () => {
    const base: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 1,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData({ ...base, seriesCount: 0 })).toThrow(
      /seriesCount.*positive integer/,
    );
    expect(() => new ChartData({ ...base, seriesCount: -1 })).toThrow(
      /seriesCount.*positive integer/,
    );
    expect(() => new ChartData({ ...base, seriesCount: 1.5 })).toThrow(
      /seriesCount.*positive integer/,
    );
  });

  it("throws when startTime is not finite", () => {
    const source: IDataSource = {
      startTime: NaN,
      timeStep: 1,
      length: 1,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData(source)).toThrow(/startTime/);
  });

  it("throws when timeStep is not finite", () => {
    const base = {
      startTime: 0,
      length: 1,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData({ ...base, timeStep: NaN })).toThrow(/timeStep/);
    expect(() => new ChartData({ ...base, timeStep: Infinity })).toThrow(
      /timeStep/,
    );
    expect(() => new ChartData({ ...base, timeStep: -Infinity })).toThrow(
      /timeStep/,
    );
  });

  it("throws when timeStep is not greater than 0", () => {
    const base: IDataSource = {
      startTime: 0,
      length: 1,
      seriesCount: 1,
      getSeries: () => 0,
      seriesAxes: [0],
      timeStep: 0,
    };
    expect(() => new ChartData({ ...base, timeStep: 0 })).toThrow(
      /greater than 0/,
    );
    expect(() => new ChartData({ ...base, timeStep: -1 })).toThrow(
      /greater than 0/,
    );
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

  it("converts time to index and back", () => {
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
    const transform = cd.indexToTime();
    for (let i = 0; i < cd.length; i++) {
      const t = transform.applyToPoint(i);
      const idx = cd.timeToIndex(t);
      expect(idx).toBeCloseTo(i);
      const t2 = transform.applyToPoint(idx);
      expect(t2).toBeCloseTo(t);
    }
  });

  it("clamps out-of-range times and validates input", () => {
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
    const transform = cd.indexToTime();
    const earliest = transform.applyToPoint(0);
    const latest = transform.applyToPoint(cd.length - 1);
    expect(cd.timeToIndex(earliest - 1000)).toBe(0);
    expect(cd.timeToIndex(latest + 1000)).toBe(cd.length - 1);
    expect(() => cd.timeToIndex(NaN)).toThrow(/time/);
    expect(() => cd.timeToIndex(Infinity)).toThrow(/time/);
    expect(() => cd.timeToIndex(-Infinity)).toThrow(/time/);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);
    expect(tree0.query(0, 1)).toEqual({ min: 3, max: 4 });
    expect(tree1.query(0, 1)).toEqual({ min: 3, max: 4 });
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
    expect(() => {
      cd.append(undefined as unknown as number, 2);
    }).toThrow(/series 0/);
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
    expect(() => {
      cd.append(2, undefined as unknown as number);
    }).toThrow(/series 1/);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);
    expect(cd.bAxisVisible(range, tree0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(range, tree1).toArr()).toEqual([20, 60]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);

    const fractionalRange = new AR1Basis(0.49, 1.49);
    expect(cd.bAxisVisible(fractionalRange, tree0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(fractionalRange, tree1).toArr()).toEqual([20, 60]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);

    const fractionalRange = new AR1Basis(1.1, 1.7);
    expect(cd.bAxisVisible(fractionalRange, tree0).toArr()).toEqual([30, 50]);
    expect(cd.bAxisVisible(fractionalRange, tree1).toArr()).toEqual([40, 60]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);

    const outOfRange = new AR1Basis(-0.5, 3.5);
    expect(() => cd.bAxisVisible(outOfRange, tree0)).not.toThrow();
    expect(() => cd.bAxisVisible(outOfRange, tree1)).not.toThrow();
    expect(cd.bAxisVisible(outOfRange, tree0).toArr()).toEqual([10, 50]);
    expect(cd.bAxisVisible(outOfRange, tree1).toArr()).toEqual([20, 60]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);

    const leftRange = new AR1Basis(-5, -1);
    expect(() => cd.bAxisVisible(leftRange, tree0)).not.toThrow();
    expect(() => cd.bAxisVisible(leftRange, tree1)).not.toThrow();
    expect(cd.bAxisVisible(leftRange, tree0).toArr()).toEqual([10, 10]);
    expect(cd.bAxisVisible(leftRange, tree1).toArr()).toEqual([20, 20]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);

    const rightRange = new AR1Basis(5, 10);
    expect(() => cd.bAxisVisible(rightRange, tree0)).not.toThrow();
    expect(() => cd.bAxisVisible(rightRange, tree1)).not.toThrow();
    expect(cd.bAxisVisible(rightRange, tree0).toArr()).toEqual([50, 50]);
    expect(cd.bAxisVisible(rightRange, tree1).toArr()).toEqual([60, 60]);
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
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);
    const { combined, dp } = cd.combinedAxisDp(cd.bIndexFull, tree0, tree1);
    expect(combined.toArr()).toEqual([-3, 10]);
    expect(dp.x().toArr()).toEqual([0, 2]);
    expect(dp.y().toArr()).toEqual([-3, 10]);
  });

  it("throws when initial data contains infinite values", () => {
    expect(
      () =>
        new ChartData(
          makeSource(
            [
              [0, 1],
              [Infinity, 2],
            ],
            [0, 1],
          ),
        ),
    ).toThrow(/finite number or NaN/);
  });

  it("allows NaN values in data", () => {
    expect(
      () =>
        new ChartData(
          makeSource(
            [
              [NaN, NaN],
              [5, 3],
            ],
            [0, 1],
          ),
        ),
    ).not.toThrow();
  });

  it("ignores NaN values when building axis tree", () => {
    const cd = new ChartData(makeSource([[1], [NaN], [3]], [0]));
    const tree = cd.buildAxisTree(0);
    expect(tree.query(0, 2)).toEqual({ min: 1, max: 3 });
  });

  describe("single-axis", () => {
    it("handles data without second series", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 2,
        seriesCount: 1,
        getSeries: (i) => [0, 1][i]!,
        seriesAxes: [0],
      };
      const cd = new ChartData(source);
      expect(cd.data).toEqual([[0], [1]]);
      cd.append(2);
      expect(cd.data).toEqual([[1], [2]]);
      const tree0 = cd.buildAxisTree(0);
      expect(tree0.query(0, 1)).toEqual({ min: 1, max: 2 });
    });

    it("ignores provided sf when single-axis", () => {
      const source: IDataSource = {
        startTime: 0,
        timeStep: 1,
        length: 1,
        seriesCount: 1,
        getSeries: (i) => [0][i]!,
        seriesAxes: [0],
      };
      const cd = new ChartData(source);
      expect(() => {
        cd.append(1);
      }).not.toThrow();
      expect(cd.data).toEqual([[1]]);
    });

    it("throws when data is all Infinity", () => {
      expect(
        () => new ChartData(makeSource([[Infinity], [Infinity]], [0])),
      ).toThrow(/finite number or NaN/);
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
    let tree0 = cd.buildAxisTree(0);
    let tree1 = cd.buildAxisTree(1);
    expect(tree0.query(0, 1)).toEqual({ min: 0, max: 20 });
    expect(tree1.query(0, 1)).toEqual({ min: 100, max: 220 });

    cd.append(2, 30, 25, 130, 230);
    expect(cd.data).toEqual([
      [1, 20, 15, 110, 220],
      [2, 30, 25, 130, 230],
    ]);
    tree0 = cd.buildAxisTree(0);
    tree1 = cd.buildAxisTree(1);
    expect(tree0.query(0, 1)).toEqual({ min: 1, max: 30 });
    expect(tree1.query(0, 1)).toEqual({ min: 110, max: 230 });
    expect(cd.getPoint(1)).toEqual({
      values: [2, 30, 25, 130, 230],
      timestamp: 2,
    });
  });
});
