import { describe, it, expect, beforeAll } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";
import { ChartData } from "./data.ts";
import { setupRender } from "./render.ts";

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

const buildNy = (i: number, arr: ReadonlyArray<[number, number?]>) => ({
  min: arr[i][0],
  max: arr[i][0],
});
const buildSf = (i: number, arr: ReadonlyArray<[number, number?]>) => ({
  min: arr[i][1]!,
  max: arr[i][1]!,
});

function createSvg() {
  const dom = new JSDOM(`<div id="c"><svg><g class="view"></g></svg></div>`, {
    pretendToBeVisual: true,
    contentType: "text/html",
  });
  const div = dom.window.document.getElementById("c") as any;
  Object.defineProperty(div, "clientWidth", { value: 100 });
  Object.defineProperty(div, "clientHeight", { value: 100 });
  return select(div).select("svg");
}

describe("setupRender Y-axis modes", () => {
  it("combines series when dualYAxis is false", () => {
    const svg = createSvg();
    const data = new ChartData(
      0,
      1,
      [
        [1, 10],
        [2, 20],
        [3, 30],
      ],
      buildNy,
      buildSf,
    );
    const state = setupRender(svg as any, data, false);
    expect(state.scales.yNy.domain()).toEqual([1, 30]);
    expect(state.scales.ySf).toBeUndefined();
  });

  it("separates scales when dualYAxis is true", () => {
    const svg = createSvg();
    const data = new ChartData(
      0,
      1,
      [
        [1, 10],
        [2, 20],
        [3, 30],
      ],
      buildNy,
      buildSf,
    );
    const state = setupRender(svg as any, data, true);
    expect(state.scales.yNy.domain()).toEqual([1, 3]);
    expect(state.scales.ySf!.domain()).toEqual([10, 30]);
  });
});
