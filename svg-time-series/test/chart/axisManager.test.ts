import { describe, it, expect, vi } from "vitest";
import { scaleTime } from "d3-scale";
import { zoomIdentity } from "d3-zoom";
import { polyfillDom } from "../../src/setupDom.ts";
import { AxisManager } from "../../src/chart/axisManager.ts";
import { ChartData } from "../../src/chart/data.ts";
await polyfillDom();

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
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(1)])
        .range([0, 1]),
    );
    axisManager.axes.forEach((a) => {
      a.scale.range([0, 1]);
    });
    const spy = vi.spyOn(data, "assertAxisBounds");
    expect(() => {
      axisManager.updateScales(zoomIdentity);
    }).toThrowError("Series axis index 1 out of bounds (max 0)");
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("does not throw when series axis indices are within bounds", () => {
    const data = makeChartData();
    const axisManager = new AxisManager(2, data);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(1)])
        .range([0, 1]),
    );
    axisManager.axes.forEach((a) => {
      a.scale.range([0, 1]);
    });
    const spy = vi.spyOn(data, "assertAxisBounds");
    expect(() => {
      axisManager.updateScales(zoomIdentity);
    }).not.toThrow();
    expect(spy).toHaveBeenCalledWith(2);
  });

  it("fits the Y domain to the visible data on zoom", () => {
    const data = new ChartData({
      startTime: 0,
      timeStep: 1,
      length: 10,
      seriesAxes: [0],
      getSeries: (i) => i,
    });
    const axisManager = new AxisManager(1, data);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(9)])
        .range([0, 100]),
    );
    axisManager.axes[0]!.scale.range([100, 0]);

    const t = zoomIdentity.scale(2);
    axisManager.updateScales(t);
    // Y-axis scale must match the baseScale domain (auto-scaled to visible
    // data) and must NOT be distorted by the horizontal zoom transform.
    expect(axisManager.axes[0]!.scale.domain()).toEqual(
      axisManager.axes[0]!.baseScale.domain(),
    );
  });

  it("Y-axis domain is stable across different zoom levels", () => {
    const data = new ChartData({
      startTime: 0,
      timeStep: 1,
      length: 100,
      seriesAxes: [0],
      getSeries: (i) => Math.sin(i / 10) * 50,
    });
    const axisManager = new AxisManager(1, data);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(99)])
        .range([0, 800]),
    );
    axisManager.axes[0]!.scale.range([400, 0]);

    // At identity zoom (no zoom), record the scale domain
    axisManager.updateScales(zoomIdentity);
    const domainNoZoom = axisManager.axes[0]!.scale.domain() as [
      number,
      number,
    ];

    // At 10× horizontal zoom the Y domain should change only because
    // different data points are visible, NOT because of rescaleY distortion.
    const t10 = zoomIdentity.scale(10);
    axisManager.updateScales(t10);
    const domain10x = axisManager.axes[0]!.scale.domain() as [number, number];

    // The 10× zoom sees roughly the first 1/10 of data (indices 0..~10).
    // sin(0/10)*50 = 0, sin(10/10)*50 ≈ 42.1  → domain should be narrower,
    // but it must NOT be squeezed further by rescaleY.
    expect(domain10x).toEqual(
      axisManager.axes[0]!.baseScale.domain() as [number, number],
    );

    // Sanity: the 10× zoom domain differs from the full-data domain because
    // fewer data points are visible, but neither endpoint should exceed the
    // original full-data range.
    expect(domain10x[0]).toBeGreaterThanOrEqual(domainNoZoom[0]);
    expect(domain10x[1]).toBeLessThanOrEqual(domainNoZoom[1]);
  });
});
