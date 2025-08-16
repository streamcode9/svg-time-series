import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import {
  AR1,
  AR1Basis,
  betweenTBasesAR1,
  DirectProductBasis,
} from "./math/affine.ts";
import { scaleToDomMatrix } from "./utils/domMatrix.ts";
import { updateNode } from "./utils/domNodeTransform.ts";
import { Matrix } from "./setupDom.ts";

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
  it("applies scale transforms along X and Y axes", () => {
    const sx = scaleLinear().domain([0, 1]).range([3, 5]);
    const mx = scaleToDomMatrix(sx, "x", new Matrix() as unknown as DOMMatrix);
    expect(mx.a).toBeCloseTo(2);
    expect(mx.e).toBeCloseTo(3);

    const sy = scaleLinear().domain([0, 1]).range([4, 7]);
    const my = scaleToDomMatrix(sy, "y", new Matrix() as unknown as DOMMatrix);
    expect(my.d).toBeCloseTo(3);
    expect(my.f).toBeCloseTo(4);
  });

  it("updates SVG node transform with a matrix", () => {
    const calls: DOMMatrix[] = [];
    const baseVal = {
      createSVGTransformFromMatrix: (m: DOMMatrix) => ({ m }),
      initialize(t: { m: DOMMatrix }) {
        calls.push(t.m);
      },
    };
    const node = {
      transform: { baseVal },
      ownerSVGElement: {
        createSVGMatrix: () => new Matrix() as unknown as DOMMatrix,
      },
    } as unknown as SVGGraphicsElement;
    const matrix = new Matrix(1, 0, 0, 1, 2, 3) as unknown as DOMMatrix;

    updateNode(node, matrix);
    expect(calls[0]).toBe(matrix);
  });
});
