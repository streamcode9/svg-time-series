import { describe, it, expect, vi } from "vitest";
import { scaleTime } from "d3-scale";
import { zoomIdentity } from "d3-zoom";

import { polyfillDom } from "../setupDom.ts";
import { AxisModel, createBaseXScale, updateAxisModel } from "./axisManager.ts";
import { ChartData } from "./data.ts";

await polyfillDom();

const makeChartData = (): ChartData =>
  new ChartData({
    startTime: 0,
    timeStep: 1,
    length: 10,
    seriesAxes: [0],
    getSeries: (i) => i,
  });

describe("createBaseXScale", () => {
  it("uses the full time domain without mutating the input", () => {
    const data = makeChartData();
    const x = scaleTime()
      .domain([new Date(5), new Date(6)])
      .range([0, 1]);
    const base = createBaseXScale(x, data.window);
    expect(base.domain()).toEqual(data.window.timeDomainFull());
    expect(x.domain()).toEqual([new Date(5), new Date(6)]);
  });
});

describe("updateAxisModel", () => {
  it("updates the axis when series data exists", () => {
    const data = makeChartData();
    const axis = new AxisModel();
    axis.scale.range([100, 0]);
    const x = scaleTime()
      .domain([new Date(0), new Date(9)])
      .range([0, 100]);
    const baseX = createBaseXScale(x, data.window);
    const t = zoomIdentity.scale(2);
    data.window.onViewPortResize(baseX.range() as [number, number]);
    const dIndexVisible = data.dIndexFromTransform(t);
    updateAxisModel(axis, 0, data, t, dIndexVisible);
    const { scale: baseScaleRaw } = data.axisTransform(0, dIndexVisible);
    const expectedDomain = t
      .rescaleY(baseScaleRaw.range(axis.scale.range() as [number, number]))
      .domain();
    expect(axis.scale.domain()).toEqual(expectedDomain);
  });

  it("skips axes without series", () => {
    const data = makeChartData();
    const axis = new AxisModel();
    const spy = vi.spyOn(axis, "updateFromData");
    updateAxisModel(axis, 1, data, zoomIdentity, [0, 1]);
    expect(spy).not.toHaveBeenCalled();
  });
});
