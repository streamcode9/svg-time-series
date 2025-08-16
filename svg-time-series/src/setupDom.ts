class Matrix {
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

  private multiplyValues(
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) {
    const { a: a0, b: b0, c: c0, d: d0, e: e0, f: f0 } = this;
    this.a = a0 * a + c0 * b;
    this.b = b0 * a + d0 * b;
    this.c = a0 * c + c0 * d;
    this.d = b0 * c + d0 * d;
    this.e = a0 * e + c0 * f + e0;
    this.f = b0 * e + d0 * f + f0;
    return this;
  }
  multiplySelf(m: Matrix) {
    return this.multiplyValues(m.a, m.b, m.c, m.d, m.e, m.f);
  }

  translate(tx: number, ty: number) {
    return this.multiply(new Matrix(1, 0, 0, 1, tx, ty));
  }
  translateSelf(tx: number, ty: number) {
    return this.multiplyValues(1, 0, 0, 1, tx, ty);
  }

  scale(sx: number, sy = sx) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0));
  }
  scaleSelf(sx: number, sy = sx) {
    return this.multiplyValues(sx, 0, 0, sy, 0, 0);
  }
  scaleNonUniform(sx: number, sy: number) {
    return this.scale(sx, sy);
  }
  scaleNonUniformSelf(sx: number, sy: number) {
    return this.multiplyValues(sx, 0, 0, sy, 0, 0);
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

class Point {
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

interface DOMGlobals {
  DOMMatrix?: typeof Matrix;
  DOMPoint?: typeof Point;
}
function polyfillDom() {
  const globalObj = globalThis as unknown as DOMGlobals;
  if (typeof globalObj.DOMMatrix === "undefined") {
    globalObj.DOMMatrix = Matrix;
  }
  if (typeof globalObj.DOMPoint === "undefined") {
    globalObj.DOMPoint = Point;
  }
  if (typeof SVGSVGElement !== "undefined") {
    (
      SVGSVGElement.prototype as unknown as {
        createSVGMatrix: () => Matrix;
      }
    ).createSVGMatrix = () => new Matrix();
  }
}

export { Matrix, Point, polyfillDom };
