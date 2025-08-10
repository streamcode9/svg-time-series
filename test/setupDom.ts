class Matrix implements DOMMatrix {
  [key: string]: unknown;
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}

  get tx() {
    return this.e;
  }
  set tx(v: number) {
    this.e = v;
  }
  get ty() {
    return this.f;
  }
  set ty(v: number) {
    this.f = v;
  }

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
  multiplySelf(m: Matrix) {
    return Object.assign(this, this.multiply(m));
  }

  translate(tx: number, ty: number) {
    return this.multiply(new Matrix(1, 0, 0, 1, tx, ty));
  }
  translateSelf(tx: number, ty: number) {
    return Object.assign(this, this.translate(tx, ty));
  }

  scale(sx: number, sy = sx) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0));
  }
  scaleSelf(sx: number, sy = sx) {
    return Object.assign(this, this.scale(sx, sy));
  }
  scaleNonUniform(sx: number, sy: number) {
    return this.scale(sx, sy);
  }
  scaleNonUniformSelf(sx: number, sy: number) {
    return Object.assign(this, this.scaleNonUniform(sx, sy));
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

  get is2D() {
    return true;
  }
  get isIdentity() {
    return (
      this.a === 1 &&
      this.b === 0 &&
      this.c === 0 &&
      this.d === 1 &&
      this.e === 0 &&
      this.f === 0
    );
  }
}

class Point implements DOMPoint {
  [key: string]: unknown;
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
    public w = 1,
  ) {}

  matrixTransform(m: Matrix) {
    return new Point(
      this.x * m.a + this.y * m.c + m.e,
      this.x * m.b + this.y * m.d + m.f,
      this.z,
      this.w,
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
      createSVGMatrix(): Matrix;
    }
  ).createSVGMatrix = () => new Matrix();
}

export { Matrix, Point };
