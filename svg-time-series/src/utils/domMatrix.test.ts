import { describe, expect, it } from "vitest";
import { scaleLinear } from "d3-scale";
import { polyfillDom } from "../setupDom.ts";
import { scaleToDomMatrix, scalesToDomMatrix } from "./domMatrix.ts";
await polyfillDom();

describe("scaleToDomMatrix", () => {
  it("creates a transform for the X axis without mutating the base", () => {
    const scale = scaleLinear().domain([0, 2]).range([3, 7]);
    const base = new DOMMatrix();
    const m = scaleToDomMatrix(scale, "x", base);
    expect(m).not.toBe(base);
    expect(base.a).toBe(1);
    expect(base.d).toBe(1);
    expect(base.e).toBe(0);
    expect(base.f).toBe(0);
    expect(m.a).toBeCloseTo(2);
    expect(m.e).toBeCloseTo(3);
  });

  it("creates a transform for the Y axis without mutating the base", () => {
    const scale = scaleLinear().domain([0, 4]).range([5, 13]);
    const base = new DOMMatrix();
    const m = scaleToDomMatrix(scale, "y", base);
    expect(m).not.toBe(base);
    expect(base.a).toBe(1);
    expect(base.d).toBe(1);
    expect(base.e).toBe(0);
    expect(base.f).toBe(0);
    expect(m.d).toBeCloseTo(2);
    expect(m.f).toBeCloseTo(5);
  });
});

describe("scalesToDomMatrix", () => {
  it("combines independent scales without mutating the base", () => {
    const sx = scaleLinear().domain([0, 2]).range([3, 7]);
    const sy = scaleLinear().domain([0, 4]).range([5, 13]);
    const base = new DOMMatrix();
    const m = scalesToDomMatrix(sx, sy, base);
    expect(m).not.toBe(base);
    expect(base.a).toBe(1);
    expect(base.d).toBe(1);
    expect(base.e).toBe(0);
    expect(base.f).toBe(0);
    expect(m.a).toBeCloseTo(2);
    expect(m.d).toBeCloseTo(2);
    expect(m.e).toBeCloseTo(3);
    expect(m.f).toBeCloseTo(5);
  });
});
