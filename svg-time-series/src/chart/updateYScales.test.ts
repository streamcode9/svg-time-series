import { describe, it, expect } from "vitest";
import { scaleLinear, scaleTime } from "d3-scale";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import { AR1Basis, DirectProductBasis } from "../math/affine.ts";
import { AxisManager } from "./axisManager.ts";
import { ChartData } from "./data.ts";
import "../setupDom.ts";

describe("updateScales", () => {
  it("updates domains for two axes using ChartData", () => {
    const source = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesAxes: [0, 1],
      getSeries: (i: number, seriesIdx: number) =>
        seriesIdx === 0 ? [1, 3][i]! : [10, 30][i]!,
    };
    const data = new ChartData(source);
    const axisManager = new AxisManager(2, data);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(1)])
        .range([0, 1]),
    );
    axisManager.axes.forEach((a) => {
      a.scale.range([0, 1]);
      a.baseScale.range([0, 1]);
    });

    axisManager.updateScales(zoomIdentity);

    expect(axisManager.axes[0]!.scale.domain()).toEqual([1, 3]);
    expect(axisManager.axes[1]!.scale.domain()).toEqual([10, 30]);
  });

  it("updates domains for multiple axes", () => {
    const data = {
      seriesAxes: [0, 1, 2, 1],
      seriesByAxis: [[0], [1, 3], [2]],
      data: [
        [1, 10, -5, 15],
        [3, 30, 5, 25],
      ],
      length: 2,
      bIndexFull: new AR1Basis(0, 1),
      assertAxisBounds(axisCount: number) {
        this.seriesByAxis.forEach((series: number[], i: number) => {
          if (i >= axisCount && series.length > 0) {
            throw new Error(
              `Series axis index ${String(i)} out of bounds (max ${String(
                axisCount - 1,
              )})`,
            );
          }
        });
      },
      buildAxisTree(axis: number) {
        const idxs = this.seriesByAxis[axis] ?? [];
        return {
          query: (start: number, end: number) => {
            let min = Infinity;
            let max = -Infinity;
            for (let i = start; i <= end; i++) {
              const row = this.data[i]!;
              for (const j of idxs) {
                const v = row[j]!;
                if (Number.isFinite(v)) {
                  min = Math.min(min, v);
                  max = Math.max(max, v);
                }
              }
            }
            return { min, max };
          },
        };
      },
      indexToTime: scaleLinear().domain([0, 1]).range([0, 1]),
      timeDomainFull(): [Date, Date] {
        return [new Date(0), new Date(1)];
      },
      bIndexFromTransform(transform: ZoomTransform, range: [number, number]) {
        const indexBase = scaleLinear()
          .domain(this.bIndexFull.toArr())
          .range(range);
        return transform.rescaleX(indexBase);
      },
      timeToIndex(t: number) {
        return t;
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
      axisTransform(axis: number, domain: [number, number]) {
        const tree = this.buildAxisTree(axis);
        const b = new AR1Basis(domain[0], domain[1]);
        const dp = this.updateScaleY(b, tree);
        const [min, max] = dp.y().toArr();
        const bAxis = new AR1Basis(min, max);
        const dpRef = DirectProductBasis.fromProjections(
          this.bIndexFull,
          bAxis,
        );
        return { tree, min, max, dpRef };
      },
    };
    const axisManager = new AxisManager(3, data as unknown as ChartData);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(1)])
        .range([0, 1]),
    );
    axisManager.axes.forEach((a) => {
      a.scale.range([0, 1]);
      a.baseScale.range([0, 1]);
    });

    axisManager.updateScales(zoomIdentity);

    expect(axisManager.axes[0]!.scale.domain()).toEqual([1, 3]);
    expect(axisManager.axes[1]!.scale.domain()).toEqual([10, 30]);
    expect(axisManager.axes[2]!.scale.domain()).toEqual([-5, 5]);
  });

  it("throws when a series references an out-of-range axis index", () => {
    const data = {
      seriesAxes: [0, 1, 2],
      seriesByAxis: [[0], [1], [2]],
      data: [
        [0, 10, -5],
        [1, 20, 5],
      ],
      length: 2,
      bIndexFull: new AR1Basis(0, 1),
      assertAxisBounds(axisCount: number) {
        this.seriesByAxis.forEach((series: number[], i: number) => {
          if (i >= axisCount && series.length > 0) {
            throw new Error(
              `Series axis index ${String(i)} out of bounds (max ${String(
                axisCount - 1,
              )})`,
            );
          }
        });
      },
      buildAxisTree(axis: number) {
        const idxs = this.seriesByAxis[axis] ?? [];
        return {
          query: (start: number, end: number) => {
            let min = Infinity;
            let max = -Infinity;
            for (let i = start; i <= end; i++) {
              const row = this.data[i]!;
              for (const j of idxs) {
                const v = row[j]!;
                if (Number.isFinite(v)) {
                  min = Math.min(min, v);
                  max = Math.max(max, v);
                }
              }
            }
            return { min, max };
          },
        };
      },
      indexToTime: scaleLinear().domain([0, 1]).range([0, 1]),
      timeDomainFull(): [Date, Date] {
        return [new Date(0), new Date(1)];
      },
      bIndexFromTransform(transform: ZoomTransform, range: [number, number]) {
        const indexBase = scaleLinear()
          .domain(this.bIndexFull.toArr())
          .range(range);
        return transform.rescaleX(indexBase);
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
      axisTransform(axis: number, domain: [number, number]) {
        const tree = this.buildAxisTree(axis);
        const b = new AR1Basis(domain[0], domain[1]);
        const dp = this.updateScaleY(b, tree);
        const [min, max] = dp.y().toArr();
        const bAxis = new AR1Basis(min, max);
        const dpRef = DirectProductBasis.fromProjections(
          this.bIndexFull,
          bAxis,
        );
        return { tree, min, max, dpRef };
      },
    };
    const axisManager = new AxisManager(2, data as unknown as ChartData);
    axisManager.setXAxis(
      scaleTime()
        .domain([new Date(0), new Date(1)])
        .range([0, 1]),
    );
    axisManager.axes.forEach((a) => {
      a.scale.range([0, 1]);
      a.baseScale.range([0, 1]);
    });

    expect(() => {
      axisManager.updateScales(zoomIdentity);
    }).toThrow(/axis index 2/i);
  });
});
