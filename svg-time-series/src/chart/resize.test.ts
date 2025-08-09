/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("../utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
const axisInstances: any[] = [];
vi.mock("../axis.ts", () => {
  return {
    MyAxis: class {
      axisUp = vi.fn();
      axis = vi.fn((s: any) => s);
      ticks = vi.fn().mockReturnThis();
      setTickSize = vi.fn().mockReturnThis();
      setTickPadding = vi.fn().mockReturnThis();
      setScale = vi.fn().mockReturnThis();
      constructor() {
        axisInstances.push(this);
      }
    },
    Orientation: { Bottom: 0, Right: 1, Left: 2 },
  };
});

import { select } from "d3-selection";
import * as renderUtils from "./render/utils.ts";
import { TimeSeriesChart, type IDataSource } from "../draw.ts";

class Matrix {
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}
  multiply(m: Matrix) {
    return new Matrix(
      this.a * m.a + this.c * m.b,
      this.b * m.a + this.d * m.b,
      this.a * m.c + this.c * m.d,
      this.b * m.c + this.d * m.d,
      this.a * m.e + this.c * m.f + this.e,
      this.b * m.e + this.d * m.f + this.f,
    );
  }
  translate(tx: number, ty: number) {
    return this.multiply(new Matrix(1, 0, 0, 1, tx, ty));
  }
  scale(sx: number, sy: number) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0));
  }
  inverse() {
    const det = this.a * this.d - this.b * this.c;
    return new Matrix(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    );
  }
}

class Point {
  constructor(
    public x = 0,
    public y = 0,
  ) {}
  matrixTransform(m: Matrix) {
    return new Point(
      this.x * m.a + this.y * m.c + m.e,
      this.x * m.b + this.y * m.d + m.f,
    );
  }
}

beforeAll(() => {
  (globalThis as any).DOMMatrix = Matrix;
  (globalThis as any).DOMPoint = Point;
});

describe("TimeSeriesChart.resize", () => {
  it("updates axes, paths, and legend", () => {
    const renderSpy = vi.spyOn(renderUtils, "renderPaths");

    const div = document.createElement("div");
    Object.defineProperty(div, "clientWidth", { value: 100 });
    Object.defineProperty(div, "clientHeight", { value: 100 });
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    div.appendChild(svgEl);

    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 1,
      seriesAxes: [0],
      getSeries: (i) => [1, 2, 3][i],
    };

    const legend = {
      highlightIndex: () => {},
      refresh: vi.fn(),
      clearHighlight: () => {},
      destroy: () => {},
    };

    const chart = new TimeSeriesChart(
      select(svgEl) as any,
      source,
      () => legend as any,
    );

    renderSpy.mockClear();
    axisInstances.forEach((a) => a.axisUp.mockClear());
    legend.refresh.mockClear();

    chart.resize({ width: 200, height: 150 });

    axisInstances.forEach((a) => expect(a.axisUp).toHaveBeenCalled());
    expect(renderSpy).toHaveBeenCalled();
    expect(legend.refresh).toHaveBeenCalled();
  });
});
