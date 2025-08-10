import { describe, expect, it } from "vitest";
import { AR1, DirectProduct } from "../math/affine.ts";
import {
  applyAR1ToMatrixX,
  applyAR1ToMatrixY,
  applyDirectProductToMatrix,
} from "./domMatrix.ts";
import { Matrix } from "../../../test/setupDom.ts";

describe("applyAR1ToMatrix helpers", () => {
  it("translates and scales along X axis", () => {
    const matrix = applyAR1ToMatrixX(new AR1([2, 3]), new Matrix());
    expect(matrix.a).toBeCloseTo(2);
    expect(matrix.e).toBeCloseTo(3);
  });

  it("translates and scales along Y axis", () => {
    const matrix = applyAR1ToMatrixY(new AR1([4, 5]), new Matrix());
    expect(matrix.d).toBeCloseTo(4);
    expect(matrix.f).toBeCloseTo(5);
  });
});

describe("applyDirectProductToMatrix", () => {
  it("combines independent AR1 transforms", () => {
    const dp = new DirectProduct(new AR1([2, 3]), new AR1([4, 5]));
    const matrix = applyDirectProductToMatrix(dp, new Matrix());
    expect(matrix.a).toBeCloseTo(2);
    expect(matrix.d).toBeCloseTo(4);
    expect(matrix.e).toBeCloseTo(3);
    expect(matrix.f).toBeCloseTo(5);
  });
});
