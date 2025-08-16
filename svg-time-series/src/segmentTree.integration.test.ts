import { expect, test } from "vitest";
import type { IDataSource } from "./chart/data.ts";
import { ChartData } from "./chart/data.ts";

const makeSource = (values: number[]): IDataSource => ({
  startTime: 0,
  timeStep: 1,
  length: values.length,
  seriesAxes: [0],
  getSeries: (i) => values[i]!,
});

test("ChartData integrates SegmentTree for range queries", () => {
  const initial = [1, 3, 2, 5, 4];
  const cd = new ChartData(makeSource(initial));

  const tree = cd.buildAxisTree(0);
  expect(tree.query(0, initial.length - 1)).toEqual({ min: 1, max: 5 });

  cd.append(6);
  const updatedTree = cd.buildAxisTree(0);
  expect(updatedTree.query(0, initial.length - 1)).toEqual({ min: 2, max: 6 });
});
