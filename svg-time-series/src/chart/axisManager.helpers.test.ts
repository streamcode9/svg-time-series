import { describe, it, expect } from "vitest";
import { scaleTime } from "d3-scale";

import { polyfillDom } from "../setupDom.ts";
import { createBaseXScale } from "./axisManager.ts";
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
