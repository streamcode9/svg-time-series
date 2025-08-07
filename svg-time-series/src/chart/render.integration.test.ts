/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, vi } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { ChartData, IDataSource } from "./data.ts";
import { setupRender } from "./render.ts";
import * as domNode from "../utils/domNodeTransform.ts";

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

describe("RenderState.refresh integration", () => {
  it("updates scales, axes and series views", () => {
    const svg = createSvg();
    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 3,
      seriesCount: 2,
      getSeries: (i, seriesIdx) =>
        seriesIdx === 0 ? [1, 2, 3][i] : [10, 20, 30][i],
    };
    const data = new ChartData(source);
    const state = setupRender(svg as any, data, true);
    const updateNodeSpy = vi
      .spyOn(domNode, "updateNode")
      .mockImplementation(() => {});

    const xBefore = state.scales.x.domain().slice();
    const yNyBefore = state.scales.yNy.domain().slice();
    const ySfBefore = state.scales.ySf!.domain().slice();

    data.append(100, 200);
    state.refresh(data);

    const xAfter = state.scales.x.domain();
    const yNyAfter = state.scales.yNy.domain();
    const ySfAfter = state.scales.ySf!.domain();

    expect(xAfter).not.toEqual(xBefore);
    expect(yNyAfter).not.toEqual(yNyBefore);
    expect(ySfAfter).not.toEqual(ySfBefore);

    expect((state.axes.x as any).scale1.domain()).toEqual(xAfter);
    expect((state.axes.y as any).scale1.domain()).toEqual(yNyAfter);
    expect((state.axes.yRight as any).scale1.domain()).toEqual(ySfAfter);

    expect(updateNodeSpy).toHaveBeenCalledTimes(state.series.length);
    for (const s of state.series) {
      expect(updateNodeSpy.mock.calls.some((call) => call[0] === s.view)).toBe(
        true,
      );
    }

    updateNodeSpy.mockRestore();
  });
});
