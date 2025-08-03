import { describe, expect, it } from 'vitest'
import {
  AR1,
  AR1Basis,
  DirectProductBasis,
  betweenTBasesDirectProduct,
} from './math/affine.ts'

describe('AR1 and AR1Basis', () => {
  it('composes and inverts AR1 transforms', () => {
    const t0 = new AR1([2, 3])
    const t1 = new AR1([4, -1])
    const composed = t0.composeWith(t1)
    expect(composed.applyToPoint(1)).toBeCloseTo(t1.applyToPoint(t0.applyToPoint(1)))

    const inv = t0.inverse()
    const identity = t0.composeWith(inv)
    expect(identity.applyToPoint(5)).toBeCloseTo(5)
  })

  it('transforms AR1Basis and computes its range', () => {
    const basis = new AR1Basis(0, 10)
    const t = new AR1([2, 3])
    const transformed = basis.transformWith(t)
    expect(transformed.toArr()).toEqual([3, 23])
    expect(transformed.getRange()).toBeCloseTo(20)
  })
})

describe('DirectProduct', () => {
  it('creates direct product transforms between bases and composes with inverses', () => {
    const b1x = new AR1Basis(0, 10)
    const b1y = new AR1Basis(0, 20)
    const b2x = new AR1Basis(10, 20)
    const b2y = new AR1Basis(20, 40)
    const dpb1 = DirectProductBasis.fromProjections(b1x, b1y)
    const dpb2 = DirectProductBasis.fromProjections(b2x, b2y)
    const dp = betweenTBasesDirectProduct(dpb1, dpb2)

    expect(dp.s1.applyToPoint(0)).toBeCloseTo(10)
    expect(dp.s1.applyToPoint(10)).toBeCloseTo(20)
    expect(dp.s2.applyToPoint(0)).toBeCloseTo(20)
    expect(dp.s2.applyToPoint(20)).toBeCloseTo(40)

    const s1Id = dp.s1.composeWith(dp.s1.inverse())
    const s2Id = dp.s2.composeWith(dp.s2.inverse())
    expect(s1Id.applyToPoint(5)).toBeCloseTo(5)
    expect(s2Id.applyToPoint(15)).toBeCloseTo(15)
  })
})
