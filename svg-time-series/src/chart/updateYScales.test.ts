import { describe, it, expect } from "vitest";
import { scaleTime } from "d3-scale";
import {
  AR1Basis,
  DirectProductBasis,
  betweenTBasesAR1,
} from "../math/affine.ts";
import { AxisManager } from "./axisManager.ts";
import { ChartData } from "./data.ts";
import "../setupDom.ts";

describe("updateScales", () => {
  it("updates domains for two axes using ChartData", () => {
    const axisManager = new AxisManager();
    axisManager.setXAxis(scaleTime().range([0, 1]));
    const axes = axisManager.create(2);
    axes.forEach((a) => a.scale.range([0, 1]));

    const source = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 2,
      seriesAxes: [0, 1],
      getSeries: (i: number, seriesIdx: number) =>
        seriesIdx === 0 ? [1, 3][i]! : [10, 30][i]!,
    };
    const data = new ChartData(source);

    const bIndexVisible = new AR1Basis(0, 1);
    axisManager.updateScales(bIndexVisible, data);

    expect(axes[0]!.scale.domain()).toEqual([1, 3]);
    expect(axes[1]!.scale.domain()).toEqual([10, 30]);
  });

  it("updates domains for multiple axes", () => {
    const axisManager = new AxisManager();
    axisManager.setXAxis(scaleTime().range([0, 1]));
    const axes = axisManager.create(3);
    axes.forEach((a) => a.scale.range([0, 1]));

    const data = {
      seriesAxes: [0, 1, 2, 1],
      seriesByAxis: [[0], [1, 3], [2]],
      data: [
        [1, 10, -5, 15],
        [3, 30, 5, 25],
      ],
      bIndexFull: new AR1Basis(0, 1),
      indexToTime() {
        return betweenTBasesAR1(new AR1Basis(0, 1), new AR1Basis(0, 1));
      },
      updateScaleY(
        b: AR1Basis,
        tree: {
          query: (start: number, end: number) => { min: number; max: number };
        },
      ) {
        const { min, max } = tree.query(0, 1);
        const by = new AR1Basis(min, max);
        return DirectProductBasis.fromProjections(b, by);
      },
    };

    const bIndexVisible = new AR1Basis(0, 1);
    axisManager.updateScales(bIndexVisible, data as unknown as ChartData);

    expect(axes[0]!.scale.domain()).toEqual([1, 3]);
    expect(axes[1]!.scale.domain()).toEqual([10, 30]);
    expect(axes[2]!.scale.domain()).toEqual([-5, 5]);
  });

  it("throws when a series references an out-of-range axis index", () => {
    const axisManager = new AxisManager();
    axisManager.setXAxis(scaleTime().range([0, 1]));
    axisManager.create(2).forEach((a) => a.scale.range([0, 1]));

    const data = {
      seriesAxes: [0, 1, 2],
      seriesByAxis: [[0], [1], [2]],
      data: [
        [0, 10, -5],
        [1, 20, 5],
      ],
      bIndexFull: new AR1Basis(0, 1),
      indexToTime() {
        return betweenTBasesAR1(new AR1Basis(0, 1), new AR1Basis(0, 1));
      },
      updateScaleY(
        b: AR1Basis,
        tree: {
          query: (start: number, end: number) => { min: number; max: number };
        },
      ) {
        const { min, max } = tree.query(0, 1);
        const by = new AR1Basis(min, max);
        return DirectProductBasis.fromProjections(b, by);
      },
    };

    const bIndexVisible = new AR1Basis(0, 1);
    expect(() => {
      axisManager.updateScales(bIndexVisible, data as unknown as ChartData);
    }).toThrow(/axis index 2/i);
  });
});
