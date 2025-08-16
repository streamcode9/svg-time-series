import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import { Matrix } from "../setupDom.ts";
import { scaleToDomMatrix, scalesToDomMatrix } from "./domMatrix.ts";

describe("scaleToDomMatrix", () => {
  it("creates a transform for the X axis", () => {
    const scale = scaleLinear().domain([0, 2]).range([3, 7]);
    const m = scaleToDomMatrix(
      scale,
      "x",
      new Matrix() as unknown as DOMMatrix,
    );
    expect(m.a).toBeCloseTo(2);
    expect(m.e).toBeCloseTo(3);
  });

  it("creates a transform for the Y axis", () => {
    const scale = scaleLinear().domain([0, 4]).range([5, 13]);
    const m = scaleToDomMatrix(
      scale,
      "y",
      new Matrix() as unknown as DOMMatrix,
    );
    expect(m.d).toBeCloseTo(2);
    expect(m.f).toBeCloseTo(5);
  });
});

describe("scalesToDomMatrix", () => {
  it("combines independent scales", () => {
    const sx = scaleLinear().domain([0, 2]).range([3, 7]);
    const sy = scaleLinear().domain([0, 4]).range([5, 13]);
    const m = scalesToDomMatrix(sx, sy, new Matrix() as unknown as DOMMatrix);
    expect(m.a).toBeCloseTo(2);
    expect(m.d).toBeCloseTo(2);
    expect(m.e).toBeCloseTo(3);
    expect(m.f).toBeCloseTo(5);
  });
});
