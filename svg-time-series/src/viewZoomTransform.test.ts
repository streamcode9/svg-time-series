import { describe, expect, it } from "vitest";
import {
  AR1,
  AR1Basis,
  betweenTBasesAR1,
  DirectProductBasis,
  betweenTBasesDirectProduct,
} from "./math/affine.ts";
import {
  applyAR1ToMatrixX,
  applyAR1ToMatrixY,
  applyDirectProductToMatrix,
  updateNode,
} from "./viewZoomTransform.ts";

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

  scaleNonUniform(sx: number, sy: number) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0));
  }
}

describe("AR1 and AR1Basis", () => {
  it("composes and inverts transformations", () => {
    const t1 = new AR1([2, 3]);
    const t2 = new AR1([4, 5]);
    const composed = t1.composeWith(t2);
    expect(composed.applyToPoint(1)).toBeCloseTo(
      t2.applyToPoint(t1.applyToPoint(1)),
    );

    const identity = t1.composeWith(t1.inverse());
    expect(identity.applyToPoint(7)).toBeCloseTo(7);
  });

  it("transforms bases and maps between them", () => {
    const basis = new AR1Basis(0, 1);
    const transform = new AR1([2, 3]);
    const transformed = basis.transformWith(transform);
    expect(transformed.toArr()).toEqual([3, 5]);
    expect(transformed.getRange()).toBeCloseTo(2);

    const target = new AR1Basis(10, 12);
    const t = betweenTBasesAR1(basis, target);
    expect(basis.transformWith(t).toArr()).toEqual(target.toArr());
  });
});

describe("DirectProduct", () => {
  it("applies independent transforms on axes", () => {
    const identity = new Matrix();
    const b1 = new DirectProductBasis([0, 0], [1, 1]);
    const b2 = new DirectProductBasis([10, 10], [20, 30]);
    const dp = betweenTBasesDirectProduct(b1, b2);
    const m = applyDirectProductToMatrix(dp, identity);

    expect(m.a).toBeCloseTo(10);
    expect(m.d).toBeCloseTo(20);
    expect(m.e).toBeCloseTo(10);
    expect(m.f).toBeCloseTo(10);
  });
});

describe("DirectProductBasis utilities", () => {
  it("builds from axis projections", () => {
    const bx = new AR1Basis(0, 2);
    const by = new AR1Basis(3, 5);
    const dpb = DirectProductBasis.fromProjections(bx, by);

    expect(dpb.x().toArr()).toEqual([0, 2]);
    expect(dpb.y().toArr()).toEqual([3, 5]);
    expect(dpb.toArr()).toEqual([
      [0, 2],
      [3, 5],
    ]);
  });
});

describe("viewZoomTransform helpers", () => {
  it("applies AR1 transforms along X and Y axes", () => {
    const mx = applyAR1ToMatrixX(new AR1([2, 3]), new Matrix());
    expect(mx.a).toBeCloseTo(2);
    expect(mx.e).toBeCloseTo(3);

    const my = applyAR1ToMatrixY(new AR1([3, 4]), new Matrix());
    expect(my.d).toBeCloseTo(3);
    expect(my.f).toBeCloseTo(4);
  });

  it("updates SVG node transform with a matrix", () => {
    const calls: any[] = [];
    const baseVal = {
      createSVGTransformFromMatrix: (m: any) => ({ m }),
      initialize(t: any) {
        calls.push(t.m);
      },
    };
    const node = {
      transform: { baseVal },
    } as unknown as SVGGraphicsElement;
    const matrix = new Matrix(1, 0, 0, 1, 2, 3) as unknown as SVGMatrix;

    updateNode(node, matrix);
    expect(calls[0]).toBe(matrix);
  });
});
