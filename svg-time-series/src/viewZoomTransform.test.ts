import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import { scaleToDomMatrix } from "./utils/domMatrix.ts";
import { updateNode } from "./utils/domNodeTransform.ts";
import { Matrix } from "./setupDom.ts";

describe("viewZoomTransform helpers", () => {
  it("applies scale transforms along X and Y axes", () => {
    const sx = scaleLinear().domain([0, 1]).range([3, 5]);
    const mx = scaleToDomMatrix(sx, "x");
    expect(mx.a).toBeCloseTo(2);
    expect(mx.e).toBeCloseTo(3);

    const sy = scaleLinear().domain([0, 1]).range([4, 7]);
    const my = scaleToDomMatrix(sy, "y");
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
