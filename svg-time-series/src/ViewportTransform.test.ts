import { beforeAll, describe, expect, it } from "vitest";
import { AR1Basis, DirectProductBasis } from "./math/affine.ts";

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

let ViewportTransform: typeof import("./ViewportTransform.ts").ViewportTransform;

beforeAll(async () => {
  (globalThis as any).DOMMatrix = Matrix;
  (globalThis as any).DOMPoint = Point;
  ({ ViewportTransform } = await import("./ViewportTransform.ts"));
});

describe("ViewportTransform", () => {
  it("composes zoom and reference transforms and inverts them", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 100),
        new AR1Basis(0, 100),
      ),
    );
    vt.onReferenceViewWindowResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 10),
        new AR1Basis(0, 10),
      ),
    );

    // without zoom
    expect(vt.fromScreenToModelX(50)).toBeCloseTo(5);
    expect(vt.fromScreenToModelY(20)).toBeCloseTo(2);

    // apply zoom: translate 10 and scale 2 on X
    vt.onZoomPan({ x: 10, k: 2 } as any);
    expect(vt.fromScreenToModelX(70)).toBeCloseTo(3);
    // Y axis unaffected by zoom transform
    expect(vt.fromScreenToModelY(20)).toBeCloseTo(2);
  });

  it("maps screen bases back to model bases through inverse transforms", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 100),
        new AR1Basis(0, 100),
      ),
    );
    vt.onReferenceViewWindowResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 10),
        new AR1Basis(0, 10),
      ),
    );
    vt.onZoomPan({ x: 10, k: 2 } as any);

    const basis = vt.fromScreenToModelBasisX(new AR1Basis(20, 40));
    const [p1, p2] = basis.toArr();
    expect(p1).toBeCloseTo(0.5);
    expect(p2).toBeCloseTo(1.5);
  });

  it("converts screen points to model points", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 100),
        new AR1Basis(0, 100),
      ),
    );
    vt.onReferenceViewWindowResize(
      DirectProductBasis.fromProjections(
        new AR1Basis(0, 10),
        new AR1Basis(0, 10),
      ),
    );
    vt.onZoomPan({ x: 10, k: 2 } as any);

    const p = (vt as any).toModelPoint(70, 20) as { x: number; y: number };
    expect(p.x).toBeCloseTo(3);
    expect(p.y).toBeCloseTo(2);
  });
});
