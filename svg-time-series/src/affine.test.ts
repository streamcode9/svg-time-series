import { describe, expect, it } from "vitest";
import {
  AR1,
  AR1Basis,
  DirectProduct,
  DirectProductBasis,
  betweenBasesAR1,
} from "./math/affine.ts";

describe("AR1 and AR1Basis", () => {
  it("composes and inverts AR1 transforms", () => {
    const t0 = new AR1([2, 3]);
    const t1 = new AR1([4, -1]);
    const composed = t0.composeWith(t1);
    expect(composed.applyToPoint(1)).toBeCloseTo(
      t1.applyToPoint(t0.applyToPoint(1)),
    );

    const inv = t0.inverse();
    const identity = t0.composeWith(inv);
    expect(identity.applyToPoint(5)).toBeCloseTo(5);
  });

  it("transforms AR1Basis and computes its range", () => {
    const basis = new AR1Basis(0, 10);
    const t = new AR1([2, 3]);
    const transformed = basis.transformWith(t);
    expect(transformed.toArr()).toEqual([3, 23]);
    expect(transformed.getRange()).toBeCloseTo(20);
  });

  it("throws an error when inverting a zero-scale AR1 transform", () => {
    const t = new AR1([0, 5]);
    expect(() => t.inverse()).toThrow(/zero scale/);
  });

  it("throws an error for zero-span input in betweenBasesAR1", () => {
    expect(() => betweenBasesAR1([1, 1], [0, 1])).toThrow(/zero span/);
  });
});

describe("DirectProduct", () => {
  it("composes and inverts direct product transforms", () => {
    const dp1 = new DirectProduct(new AR1([2, 3]), new AR1([4, 5]));
    const dp2 = new DirectProduct(new AR1([6, 7]), new AR1([8, 9]));
    const composed = dp1.composeWith(dp2);
    const [x, y] = composed.applyToPoint([1, 1]);
    expect(x).toBeCloseTo(dp2.s1.applyToPoint(dp1.s1.applyToPoint(1)));
    expect(y).toBeCloseTo(dp2.s2.applyToPoint(dp1.s2.applyToPoint(1)));

    const identity = dp1.composeWith(dp1.inverse());
    const [ix, iy] = identity.applyToPoint([2, 3]);
    expect(ix).toBeCloseTo(2);
    expect(iy).toBeCloseTo(3);
  });

  it("transforms direct product bases", () => {
    const basis = new DirectProductBasis([0, 0], [1, 1]);
    const dp = new DirectProduct(new AR1([2, 3]), new AR1([4, 5]));
    const transformed = basis.transformWith(dp);
    expect(transformed.toArr()).toEqual([
      [dp.s1.applyToPoint(0), dp.s1.applyToPoint(1)],
      [dp.s2.applyToPoint(0), dp.s2.applyToPoint(1)],
    ]);
  });
});
