import { beforeAll, describe, expect, it } from "vitest";
import { zoomIdentity } from "d3-zoom";
import { scaleLinear } from "d3-scale";
import { polyfillDom } from "./setupDom.ts";
import type { ViewportTransform as ViewportTransformClass } from "./ViewportTransform.ts";
import { scalesToDomMatrix } from "./utils/domMatrix.ts";

await polyfillDom();

let ViewportTransform: typeof ViewportTransformClass;

beforeAll(async () => {
  ({ ViewportTransform } = await import("./ViewportTransform.ts"));
});

describe("ViewportTransform", () => {
  it("composes zoom and reference transforms and inverts them", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);

    // without zoom
    expect(vt.scaleX.invert(50)).toBeCloseTo(5);
    expect(vt.scaleY.invert(20)).toBeCloseTo(2);

    // apply zoom: translate 10 and scale 2
    const zoom = zoomIdentity.translate(10, 0).scale(2);
    vt.onZoomPan(zoom);
    expect(vt.scaleX.invert(70)).toBeCloseTo(3);
    expect(vt.scaleY.invert(20)).toBeCloseTo(2);

    const sx = scaleLinear().domain([0, 10]).range([0, 100]);
    const sy = scaleLinear().domain([0, 10]).range([0, 100]);
    const expected = scalesToDomMatrix(zoom.rescaleX(sx), sy);
    expect(vt.matrix.a).toBeCloseTo(expected.a);
    expect(vt.matrix.e).toBeCloseTo(expected.e);
  });

  it("maps screen bases back to model bases through inverse transforms", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const basisX: [number, number] = [
      vt.scaleX.invert(20),
      vt.scaleX.invert(40),
    ];
    const [x1, x2] = basisX;
    expect(x1).toBeCloseTo(0.5);
    expect(x2).toBeCloseTo(1.5);

    const basisY: [number, number] = [
      vt.scaleY.invert(20),
      vt.scaleY.invert(40),
    ];
    const [y1, y2] = basisY;
    expect(y1).toBeCloseTo(2);
    expect(y2).toBeCloseTo(4);
  });

  it("converts screen points to model points", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const x = vt.scaleX.invert(70);
    const y = vt.scaleY.invert(20);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(2);
  });

  it("round-trips between screen and model coordinates", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const xScreen = 70;
    const xModel = vt.scaleX.invert(xScreen);
    expect(vt.scaleX(xModel)).toBeCloseTo(xScreen);

    const yScreen = 20;
    const yModel = vt.scaleY.invert(yScreen);
    expect(vt.scaleY(yModel)).toBeCloseTo(yScreen);

    const basisScreenX: [number, number] = [20, 40];
    const basisModelX: [number, number] = [
      vt.scaleX.invert(basisScreenX[0]),
      vt.scaleX.invert(basisScreenX[1]),
    ];
    const roundTripX: [number, number] = [
      vt.scaleX(basisModelX[0]),
      vt.scaleX(basisModelX[1]),
    ];
    const [x1, x2] = roundTripX;
    expect(x1).toBeCloseTo(20);
    expect(x2).toBeCloseTo(40);

    const basisScreenY: [number, number] = [20, 40];
    const basisModelY: [number, number] = [
      vt.scaleY.invert(basisScreenY[0]),
      vt.scaleY.invert(basisScreenY[1]),
    ];
    const roundTripY: [number, number] = [
      vt.scaleY(basisModelY[0]),
      vt.scaleY(basisModelY[1]),
    ];
    const [y1, y2] = roundTripY;
    expect(y1).toBeCloseTo(20);
    expect(y2).toBeCloseTo(40);
  });

  it("keeps pan offset constant when scaling", () => {
    const vt = new ViewportTransform();
    vt.onZoomPan(zoomIdentity.translate(50, 0));
    const t1 = vt.matrix.e;
    vt.onZoomPan(zoomIdentity.translate(50, 0).scale(2));
    const t2 = vt.matrix.e;
    expect(t1).toBeCloseTo(50);
    expect(t2).toBeCloseTo(50);
  });

  it("throws when the x range collapses", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 0], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    expect(() => vt.scaleX.invert(0)).toThrow(/degenerate/);
  });

  it("throws when the y range collapses", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [50, 50]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    expect(() => vt.scaleY.invert(0)).toThrow(/degenerate/);
  });

  it("throws when the y domain collapses", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [5, 5]);
    expect(() => vt.scaleY(5)).toThrow(/degenerate/);
  });

  it("throws when the y range collapses in toScreenFromModelY", () => {
    const vt = new ViewportTransform();
    vt.onViewPortResize([0, 100], [50, 50]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);
    expect(() => vt.scaleY(0)).toThrow(/degenerate/);
  });

  it("throws a helpful error when scale is zero", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);

    vt.onZoomPan(zoomIdentity.scale(0));
    expect(() => vt.scaleX.invert(10)).toThrow(/degenerate/);
  });

  it("handles scale near zero without treating it as degenerate", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize([0, 100], [0, 100]);
    vt.onReferenceViewWindowResize([0, 10], [0, 10]);

    vt.onZoomPan(zoomIdentity.scale(1e-15));
    expect(() => vt.scaleX.invert(10)).not.toThrow();
  });
});
