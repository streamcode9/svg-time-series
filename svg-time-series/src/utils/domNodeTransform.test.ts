import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { updateNode } from "./domNodeTransform.ts";

interface FakeTransform {
  matrix: unknown;
}

class FakeTransformList {
  last: unknown;

  createSVGTransformFromMatrix(matrix: unknown): FakeTransform {
    return { matrix };
  }

  initialize(t: FakeTransform): void {
    this.last = t.matrix;
  }
}

function createNode() {
  const { document } = new JSDOM("<svg></svg>").window;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  (g as unknown as { transform: { baseVal: FakeTransformList } }).transform = {
    baseVal: new FakeTransformList(),
  };
  return g as unknown as SVGGraphicsElement & {
    transform: { baseVal: FakeTransformList };
  };
}

describe("updateNode", () => {
  it("applies matrix to transform list", () => {
    const node = createNode();
    const matrix = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 10,
      f: 20,
    } as unknown as SVGMatrix;
    updateNode(node, matrix);
    expect(node.transform.baseVal.last).toBe(matrix);
  });

  it("replaces existing transform", () => {
    const node = createNode();
    const first = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 5,
      f: 5,
    } as unknown as SVGMatrix;
    const second = {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 10,
      f: 10,
    } as unknown as SVGMatrix;
    updateNode(node, first);
    updateNode(node, second);
    expect(node.transform.baseVal.last).toBe(second);
  });
});
