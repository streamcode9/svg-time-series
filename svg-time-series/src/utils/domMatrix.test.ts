import { describe, expect, it } from "vitest";
import { AR1, DirectProduct } from "../math/affine.ts";
import {
  applyAR1ToMatrixX,
  applyAR1ToMatrixY,
  applyDirectProductToMatrix,
} from "./domMatrix.ts";

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
}

describe("applyAR1ToMatrix helpers", () => {
  it("translates and scales along X axis", () => {
    const matrix = applyAR1ToMatrixX(
      new AR1([2, 3]),
      new Matrix() as unknown as DOMMatrix,
    );
    expect(matrix.a).toBeCloseTo(2);
    expect(matrix.e).toBeCloseTo(3);
  });

  it("translates and scales along Y axis", () => {
    const matrix = applyAR1ToMatrixY(
      new AR1([4, 5]),
      new Matrix() as unknown as DOMMatrix,
    );
    expect(matrix.d).toBeCloseTo(4);
    expect(matrix.f).toBeCloseTo(5);
  });
});

describe("applyDirectProductToMatrix", () => {
  it("combines independent AR1 transforms", () => {
    const dp = new DirectProduct(new AR1([2, 3]), new AR1([4, 5]));
    const matrix = applyDirectProductToMatrix(
      dp,
      new Matrix() as unknown as DOMMatrix,
    );
    expect(matrix.a).toBeCloseTo(2);
    expect(matrix.d).toBeCloseTo(4);
    expect(matrix.e).toBeCloseTo(3);
    expect(matrix.f).toBeCloseTo(5);
  });
});
