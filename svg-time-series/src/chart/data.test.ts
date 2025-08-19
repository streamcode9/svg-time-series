import { describe, it, expect } from "vitest";
import type { IDataSource } from "./data.ts";
import { ChartData } from "./data.ts";

describe("ChartData", () => {
  const makeSource = (data: number[][], seriesAxes: number[]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    getSeries: (i, seriesIdx) => data[i]![seriesIdx]!,
    seriesAxes,
  });

  it("throws when length is not a positive integer", () => {
    const base: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 1,
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

  it("throws when startTime is not finite", () => {
    const source: IDataSource = {
      startTime: NaN,
      timeStep: 1,
      length: 1,
      getSeries: () => 0,
      seriesAxes: [0],
    };
    expect(() => new ChartData(source)).toThrow(/startTime/);
  });

  it("throws when timeStep is not finite", () => {
    const base = {
      startTime: 0,
      length: 1,
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

  it("throws when seriesAxes is empty", () => {
    const source = makeSource([[0], [1]], []);
    expect(() => new ChartData(source)).toThrow(/at least one series/);
  });

  it("throws when series axis index exceeds axisCount", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 0],
          [1, 1],
        ],
        [0, 1],
      ),
    );
    expect(() => {
      cd.assertAxisBounds(1);
    }).toThrowError("Series axis index 1 out of bounds (max 0)");
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

  describe("append validation", () => {
    const makeCd = () => new ChartData(makeSource([[0, 0]], [0, 1]));

    it("accepts values matching series count", () => {
      const cd = makeCd();
      expect(() => {
        cd.append(1, 2);
      }).not.toThrow();
      expect(cd.data).toEqual([[1, 2]]);
    });

    it("throws when value count does not match series count", () => {
      const cd = makeCd();
      expect(() => {
        cd.append(1);
      }).toThrow(/expected 2 values; received 1/);
      expect(() => {
        cd.append(1, 2, 3);
      }).toThrow(/expected 2 values; received 3/);
    });

    it("throws when values are not finite numbers", () => {
      const cd = makeCd();
      expect(() => {
        cd.append(1, NaN);
      }).toThrow(/values\[1\]/);
      expect(() => {
        cd.append(Infinity, 1);
      }).toThrow(/values\[0\]/);
    });
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
    expect(cd.clampIndex(1_000_000)).toBe(cd.length - 1);
    expect(cd.clampIndex(-1_000_000)).toBe(0);
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
    for (let i = 0; i < cd.length; i++) {
      const t = new Date(cd.startTime + i * cd.timeStep);
      const idx = cd.timeToIndex(t);
      expect(idx).toBeCloseTo(i);
      const t2 = cd.indexToTime(idx);
      expect(+t2).toBeCloseTo(+t);
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
    const earliest = new Date(cd.startTime);
    const latest = new Date(cd.startTime + cd.timeStep * (cd.length - 1));
    expect(cd.timeToIndex(new Date(+earliest - 1000))).toBe(0);
    expect(cd.timeToIndex(new Date(+latest + 1000))).toBe(cd.length - 1);
    expect(() => cd.timeToIndex(new Date(NaN))).toThrow(/time/);
    expect(() => cd.timeToIndex(new Date(Infinity))).toThrow(/time/);
    expect(() => cd.timeToIndex(new Date(-Infinity))).toThrow(/time/);
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
    }).toThrow(/values\[0\]/);
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
    }).toThrow(/values\[1\]/);
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
    const range: [number, number] = [0, 2];
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);
    expect(cd.scaleY(range, tree0).domain()).toEqual([10, 50]);
    expect(cd.scaleY(range, tree1).domain()).toEqual([20, 60]);
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

    const fractionalRange: [number, number] = [0.49, 1.49];
    expect(cd.scaleY(fractionalRange, tree0).domain()).toEqual([10, 50]);
    expect(cd.scaleY(fractionalRange, tree1).domain()).toEqual([20, 60]);
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

    const fractionalRange: [number, number] = [1.1, 1.7];
    expect(cd.scaleY(fractionalRange, tree0).domain()).toEqual([30, 50]);
    expect(cd.scaleY(fractionalRange, tree1).domain()).toEqual([40, 60]);
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

    const outOfRange: [number, number] = [-0.5, 3.5];
    expect(() => cd.scaleY(outOfRange, tree0)).not.toThrow();
    expect(() => cd.scaleY(outOfRange, tree1)).not.toThrow();
    expect(cd.scaleY(outOfRange, tree0).domain()).toEqual([10, 50]);
    expect(cd.scaleY(outOfRange, tree1).domain()).toEqual([20, 60]);
  });

  it("expands domain when all axis values are equal", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 10],
          [0, 10],
          [0, 10],
        ],
        [0, 1],
      ),
    );
    const tree0 = cd.buildAxisTree(0);
    const tree1 = cd.buildAxisTree(1);
    const range: [number, number] = [0, 2];
    expect(cd.scaleY(range, tree0).domain()).toEqual([-0.5, 0.5]);
    expect(cd.scaleY(range, tree1).domain()).toEqual([9.5, 10.5]);
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

    const leftRange: [number, number] = [-5, -1];
    expect(() => cd.scaleY(leftRange, tree0)).not.toThrow();
    expect(() => cd.scaleY(leftRange, tree1)).not.toThrow();
    expect(cd.scaleY(leftRange, tree0).domain()).toEqual([9.5, 10.5]);
    expect(cd.scaleY(leftRange, tree1).domain()).toEqual([19.5, 20.5]);
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

    const rightRange: [number, number] = [5, 10];
    expect(() => cd.scaleY(rightRange, tree0)).not.toThrow();
    expect(() => cd.scaleY(rightRange, tree1)).not.toThrow();
    expect(cd.scaleY(rightRange, tree0).domain()).toEqual([49.5, 50.5]);
    expect(cd.scaleY(rightRange, tree1).domain()).toEqual([59.5, 60.5]);
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
    const scale = cd.combinedAxisDomain(cd.bIndexFull, tree0, tree1);
    expect(scale.domain()).toEqual([-3, 10]);
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

  it("reuses axis trees until new data arrives", () => {
    const cd = new ChartData(
      makeSource(
        [
          [0, 10],
          [1, 20],
        ],
        [0, 1],
      ),
    );
    const treeA = cd.buildAxisTree(0);
    const treeB = cd.buildAxisTree(0);
    expect(treeA).toBe(treeB);
    cd.append(2, 30);
    const treeC = cd.buildAxisTree(0);
    expect(treeC).not.toBe(treeA);
  });

  it("replaces data source and rebuilds internal state", () => {
    const cd = new ChartData(
      makeSource(
        [
          [1, 2],
          [3, 4],
        ],
        [0, 1],
      ),
    );
    const oldWindow = cd.window;
    const oldAxis0 = cd.axes[0];
    const oldAxis1 = cd.axes[1];
    const source2 = makeSource(
      [
        [5, 6, 7],
        [8, 9, 10],
      ],
      [1, 0, 1],
    );
    cd.replace(source2);
    expect(cd.data).toEqual([
      [5, 6, 7],
      [8, 9, 10],
    ]);
    expect(cd.seriesAxes).toEqual([1, 0, 1]);
    expect(cd.seriesCount).toBe(3);
    expect(cd.seriesByAxis[0]).toEqual([1]);
    expect(cd.seriesByAxis[1]).toEqual([0, 2]);
    expect(cd.window).not.toBe(oldWindow);
    expect(cd.axes[0]).not.toBe(oldAxis0);
    expect(cd.axes[1]).not.toBe(oldAxis1);
    expect(cd.startTime).toBe(0);
    expect(cd.timeStep).toBe(1);
    expect(cd.length).toBe(2);
  });

  it("matches new instance state after replace", () => {
    const source1 = makeSource(
      [
        [1, 2],
        [3, 4],
      ],
      [0, 1],
    );
    const source2 = makeSource(
      [
        [5, 6, 7],
        [8, 9, 10],
      ],
      [1, 0, 1],
    );
    const cd = new ChartData(source1);
    cd.replace(source2);
    const expected = new ChartData(source2);
    expect(cd.seriesAxes).toEqual(expected.seriesAxes);
    expect(cd.seriesByAxis).toEqual(expected.seriesByAxis);
    expect(cd.seriesCount).toBe(expected.seriesCount);
    expect(cd.startTime).toBe(expected.startTime);
    expect(cd.timeStep).toBe(expected.timeStep);
    expect(cd.data).toEqual(expected.data);
    expect(cd.length).toBe(expected.length);
    const tree0 = cd.buildAxisTree(0);
    const tree0Expected = expected.buildAxisTree(0);
    expect(tree0.query(0, cd.length - 1)).toEqual(
      tree0Expected.query(0, expected.length - 1),
    );
    const tree1 = cd.buildAxisTree(1);
    const tree1Expected = expected.buildAxisTree(1);
    expect(tree1.query(0, cd.length - 1)).toEqual(
      tree1Expected.query(0, expected.length - 1),
    );
  });
});
