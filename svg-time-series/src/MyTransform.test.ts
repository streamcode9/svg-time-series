import { describe, expect, it } from 'vitest'
import { MyTransform } from './MyTransform.ts'
import { AR1Basis } from './viewZoomTransform.ts'

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
    )
  }

  translate(tx: number, ty: number) {
    return this.multiply(new Matrix(1, 0, 0, 1, tx, ty))
  }

  scaleNonUniform(sx: number, sy: number) {
    return this.multiply(new Matrix(sx, 0, 0, sy, 0, 0))
  }

  inverse() {
    const det = this.a * this.d - this.b * this.c
    return new Matrix(
      this.d / det,
      -this.b / det,
      -this.c / det,
      this.a / det,
      (this.c * this.f - this.d * this.e) / det,
      (this.b * this.e - this.a * this.f) / det,
    )
  }
}

class Point {
  constructor(public x = 0, public y = 0) {}

  matrixTransform(m: Matrix) {
    return new Point(
      this.x * m.a + this.y * m.c + m.e,
      this.x * m.b + this.y * m.d + m.f,
    )
  }
}

describe('MyTransform', () => {
  it('composes zoom and reference transforms and inverts them', () => {
    const svg = {
      createSVGMatrix: () => new Matrix(),
      createSVGPoint: () => new Point(),
    } as unknown as SVGSVGElement
    const g = {} as unknown as SVGGElement
    const mt = new MyTransform(svg, g)

    mt.onViewPortResize(new AR1Basis(0, 100), new AR1Basis(0, 100))
    mt.onReferenceViewWindowResize(new AR1Basis(0, 10), new AR1Basis(0, 10))

    // without zoom
    expect(mt.fromScreenToModelX(50)).toBeCloseTo(5)
    expect(mt.fromScreenToModelY(20)).toBeCloseTo(2)

    // apply zoom: translate 10 and scale 2 on X
    mt.onZoomPan({ x: 10, k: 2 } as any)
    expect(mt.fromScreenToModelX(70)).toBeCloseTo(3)
    // Y axis unaffected by zoom transform
    expect(mt.fromScreenToModelY(20)).toBeCloseTo(2)
  })
})
