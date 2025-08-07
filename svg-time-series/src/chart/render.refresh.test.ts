/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("../utils/domNodeTransform.ts", () => ({ updateNode: vi.fn() }));
vi.mock("../axis.ts", () => {
  return {
    MyAxis: class {
      axisUp = vi.fn();
      axis = vi.fn((s: any) => s);
      ticks = vi.fn().mockReturnThis();
      setTickSize = vi.fn().mockReturnThis();
      setTickPadding = vi.fn().mockReturnThis();
      setScale = vi.fn().mockReturnThis();
    },
    Orientation: { Top: 0, Right: 1, Bottom: 2, Left: 3 },
  };
});

import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { ChartData, type IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
import { updateNode } from "../utils/domNodeTransform.ts";

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

function createSvg() {
  const dom = new JSDOM(`<div id="c"><svg></svg></div>`, {
    pretendToBeVisual: true,
    contentType: "text/html",
  });
  const div = dom.window.document.getElementById("c") as any;
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 100 });
  return select(div).select("svg");
}

describe("RenderState.refresh", () => {
  it("handles single series with secondary data", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i] : [10, 20, 30][i]),
    };
    const data = new ChartData(source);
    const state = setupRender(svg as any, data, false);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data);

    expect(state.series[0].tree).toBe(data.treeNy);
    expect(state.series[1].tree).toBe(data.treeSf);
    expect(state.series[0].scale.domain()).toEqual([1, 30]);
    expect(state.series[1].scale.domain()).toEqual([1, 30]);
    expect(updateNodeMock).toHaveBeenCalledTimes(2);
    expect(updateNodeMock).toHaveBeenNthCalledWith(
      1,
      state.series[0].view,
      state.transforms.ny.matrix,
    );
    expect(updateNodeMock).toHaveBeenNthCalledWith(
      2,
      state.series[1].view,
      state.transforms.ny.matrix,
    );
  });

  it("updates dual-axis series independently", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i] : [10, 20, 30][i]),
    };
    const data = new ChartData(source);
    const state = setupRender(svg as any, data, true);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data);

    expect(state.series[0].tree).toBe(data.treeNy);
    expect(state.series[1].tree).toBe(data.treeSf);
    expect(state.series[0].scale.domain()).toEqual([1, 3]);
    expect(state.series[1].scale.domain()).toEqual([10, 30]);
    expect(updateNodeMock).toHaveBeenCalledTimes(2);
    expect(updateNodeMock).toHaveBeenNthCalledWith(
      1,
      state.series[0].view,
      state.transforms.ny.matrix,
    );
    expect(updateNodeMock).toHaveBeenNthCalledWith(
      2,
      state.series[1].view,
      state.transforms.sf!.matrix,
    );
  });

  it("refreshes after data changes", () => {
    const svg = createSvg();
    const source1: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      getSeries: (i, s) => (s === 0 ? [1, 2, 3][i] : [10, 20, 30][i]),
    };
    const data1 = new ChartData(source1);
    const state = setupRender(svg as any, data1, true);
    state.refresh(data1);
    const source2: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      getSeries: (i, s) => (s === 0 ? [4, 5, 6][i] : [40, 50, 60][i]),
    };
    const data2 = new ChartData(source2);
    const updateNodeMock = vi.mocked(updateNode);
    updateNodeMock.mockClear();

    state.refresh(data2);

    expect(state.series[0].tree).toBe(data2.treeNy);
    expect(state.series[1].tree).toBe(data2.treeSf);
    expect(state.series[0].scale.domain()).toEqual([4, 6]);
    expect(state.series[1].scale.domain()).toEqual([40, 60]);
    expect(updateNodeMock).toHaveBeenCalledTimes(2);
  });
});
