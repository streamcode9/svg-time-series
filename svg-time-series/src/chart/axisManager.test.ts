import { describe, it, expect, vi } from "vitest";
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
    seriesAxes: [0, 1],
    getSeries: (i, seriesIdx) => (seriesIdx === 0 ? [0, 1][i]! : [10, 20][i]!),
  });

describe("AxisManager", () => {
  it("throws when series axes exceed created axes", () => {
    const data = makeChartData();
    const axisManager = new AxisManager(1, data);
    axisManager.setXAxis(scaleTime().range([0, 1]));
    axisManager.axes.forEach((a) => a.scale.range([0, 1]));
    const spy = vi.spyOn(data, "assertAxisBounds");
    const bIndexVisible = new AR1Basis(0, 1);

    expect(() => {
      axisManager.updateScales(bIndexVisible);
    }).toThrowError("Series axis index 1 out of bounds (max 0)");
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("does not throw when series axis indices are within bounds", () => {
    const data = makeChartData();
    const axisManager = new AxisManager(2, data);
    axisManager.setXAxis(scaleTime().range([0, 1]));
    axisManager.axes.forEach((a) => a.scale.range([0, 1]));
    const spy = vi.spyOn(data, "assertAxisBounds");
    const bIndexVisible = new AR1Basis(0, 1);

    expect(() => {
      axisManager.updateScales(bIndexVisible);
    }).not.toThrow();
    expect(spy).toHaveBeenCalledWith(2);
  });
});
