import { describe, it, expect } from "vitest";
import { Matrix } from "../setupDom.ts";
import {
  updateNode,
  isSVGMatrix,
  domMatrixToSVGMatrix,
} from "./domNodeTransform.ts";

class FakeSVGMatrix {
  constructor(
    public a = 1,
    public b = 0,
    public c = 0,
    public d = 1,
    public e = 0,
    public f = 0,
  ) {}
}

class FakeSVGSVGElement {
  createSVGMatrix() {
    return new FakeSVGMatrix();
  }
}

interface FakeTransform {
  matrix: FakeSVGMatrix;
}

class FakeTransformList {
  last?: FakeSVGMatrix;

  createSVGTransformFromMatrix(matrix: unknown): FakeTransform {
    if (!(matrix instanceof FakeSVGMatrix)) {
      throw new TypeError("parameter 1 is not of type 'SVGMatrix'");
    }
    return { matrix };
  }

  initialize(t: FakeTransform): void {
    this.last = t.matrix;
  }
}

function createNode() {
  const svg = new FakeSVGSVGElement();
  return {
    transform: { baseVal: new FakeTransformList() },
    ownerSVGElement: svg,
  } as unknown as SVGGraphicsElement & {
    transform: { baseVal: FakeTransformList };
    ownerSVGElement: FakeSVGSVGElement;
  };
}

describe("updateNode", () => {
  it("applies matrix to transform list", () => {
    const node = createNode();
    const matrix = new FakeSVGMatrix();
    matrix.e = 10;
    matrix.f = 20;
    updateNode(node, matrix as unknown as SVGMatrix);
    expect(node.transform.baseVal.last).toBe(matrix);
  });

  it("converts DOMMatrix to SVGMatrix", () => {
    const node = createNode();
    const domMatrix = new Matrix().translate(5, 6);
    updateNode(node, domMatrix as unknown as DOMMatrix);
    const last = node.transform.baseVal.last as FakeSVGMatrix;
    expect(last).toBeInstanceOf(FakeSVGMatrix);
    expect(last.e).toBeCloseTo(5);
    expect(last.f).toBeCloseTo(6);
  });
});

describe("domMatrixToSVGMatrix", () => {
  it("returns same matrix for SVGMatrix", () => {
    const svg = new FakeSVGSVGElement();
    const matrix = svg.createSVGMatrix();
    const result = domMatrixToSVGMatrix(
      svg as unknown as SVGSVGElement,
      matrix as unknown as DOMMatrix,
    );
    expect(result).toBe(matrix);
  });

  it("converts DOMMatrix to SVGMatrix", () => {
    const svg = new FakeSVGSVGElement();
    const domMatrix = new Matrix().translate(5, 6);
    const result = domMatrixToSVGMatrix(
      svg as unknown as SVGSVGElement,
      domMatrix as unknown as DOMMatrix,
    );
    expect(result).toBeInstanceOf(FakeSVGMatrix);
    expect(result.e).toBeCloseTo(5);
    expect(result.f).toBeCloseTo(6);
  });
});

describe("isSVGMatrix", () => {
  it("returns true for SVGMatrix", () => {
    const svg = new FakeSVGSVGElement();
    const matrix = svg.createSVGMatrix();
    expect(
      isSVGMatrix(
        matrix as unknown as DOMMatrix,
        svg as unknown as SVGSVGElement,
      ),
    ).toBe(true);
  });

  it("returns false for DOMMatrix", () => {
    const svg = new FakeSVGSVGElement();
    const domMatrix = new Matrix();
    expect(
      isSVGMatrix(
        domMatrix as unknown as DOMMatrix,
        svg as unknown as SVGSVGElement,
      ),
    ).toBe(false);
  });
});
