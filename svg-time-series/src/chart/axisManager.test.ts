import { describe, it, expect } from "vitest";
import { scaleTime } from "d3-scale";
import { AR1Basis } from "../math/affine.ts";
import { AxisManager } from "./axisManager.ts";
import { ChartData } from "./data.ts";
import "../setupDom.ts";

const makeChartData = (): ChartData =>
  new ChartData({
    startTime: 0,
    timeStep: 1,
    length: 2,
    seriesCount: 2,
    seriesAxes: [0, 1],
    getSeries: (i, seriesIdx) => (seriesIdx === 0 ? [0, 1][i]! : [10, 20][i]!),
  });

describe("AxisManager", () => {
  it("throws when series axes exceed created axes", () => {
    const axisManager = new AxisManager();
    axisManager.setXAxis(scaleTime().range([0, 1]));
    const axes = axisManager.create(1);
    axes.forEach((a) => a.scale.range([0, 1]));

    const data = makeChartData();
    const bIndexVisible = new AR1Basis(0, 1);

    expect(() => {
      axisManager.updateScales(bIndexVisible, data);
    }).toThrowError("Series axis index 1 out of bounds (max 0)");
  });

  it("does not throw when series axis indices are within bounds", () => {
    const axisManager = new AxisManager();
    axisManager.setXAxis(scaleTime().range([0, 1]));
    const axes = axisManager.create(2);
    axes.forEach((a) => a.scale.range([0, 1]));

    const data = makeChartData();
    const bIndexVisible = new AR1Basis(0, 1);

    expect(() => {
      axisManager.updateScales(bIndexVisible, data);
    }).not.toThrow();
  });
});
