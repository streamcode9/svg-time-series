import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import { scaleToDomMatrix } from "./utils/domMatrix.ts";
import { updateNode } from "./utils/domNodeTransform.ts";
import { polyfillDom } from "./setupDom.ts";
await polyfillDom();

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
    const calls: string[] = [];
    const node = {
      setAttribute(_name: string, value: string) {
        calls.push(value);
      },
    } as unknown as SVGGraphicsElement;
    const matrix = new DOMMatrix([1, 0, 0, 1, 2, 3]);

    updateNode(node, matrix);
    expect(calls[0]).toBe("matrix(1,0,0,1,2,3)");
  });
});
