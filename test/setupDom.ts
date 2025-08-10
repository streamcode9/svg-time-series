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
    return new Matrix(1, 0, 0, 1, tx, ty).multiply(this);
  }

  scale(sx: number, sy: number) {
    return new Matrix(sx, 0, 0, sy, 0, 0).multiply(this);
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

const globalObj = globalThis as typeof globalThis & {
  DOMMatrix: typeof Matrix;
  DOMPoint: typeof Point;
};
globalObj.DOMMatrix = Matrix;
globalObj.DOMPoint = Point;
if (typeof SVGSVGElement !== "undefined") {
  (
    SVGSVGElement.prototype as SVGSVGElement & {
      createSVGMatrix: () => Matrix;
    }
  ).createSVGMatrix = () => new Matrix();
}

export { Matrix, Point };
