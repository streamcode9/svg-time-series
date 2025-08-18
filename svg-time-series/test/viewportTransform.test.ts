import { describe, it, expect } from "vitest";
import { ViewportTransform } from "../src/ViewportTransform.ts";
import { polyfillDom } from "../src/setupDom.ts";

await polyfillDom();

describe("ViewportTransform degeneracy", () => {
  it("throws only for degenerate X domain", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 0], [0, 10]);

    expect(() => vt.fromScreenToModelY(50)).not.toThrow();
    expect(() => vt.fromScreenToModelX(50)).toThrow();
  });

  it("throws only for degenerate Y domain", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 0]);

    expect(() => vt.fromScreenToModelX(50)).not.toThrow();
    expect(() => vt.fromScreenToModelY(50)).toThrow();
  });

  it("throws only for degenerate X range", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 0], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);

    expect(() => vt.fromScreenToModelY(50)).not.toThrow();
    expect(() => vt.toScreenFromModelX(5)).toThrow();
  });

  it("throws only for degenerate Y range", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [0, 0]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);

    expect(() => vt.fromScreenToModelX(5)).not.toThrow();
    expect(() => vt.fromScreenToModelY(50)).toThrow();
  });
});
