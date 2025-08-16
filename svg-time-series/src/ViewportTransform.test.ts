import { beforeAll, describe, expect, it } from "vitest";
import { zoomIdentity } from "d3-zoom";
import { polyfillDom } from "./setupDom.ts";
import type { Basis } from "./basis.ts";
import { toDirectProductBasis } from "./basis.ts";
import type { ViewportTransform as ViewportTransformClass } from "./ViewportTransform.ts";

polyfillDom();

let ViewportTransform: typeof ViewportTransformClass;

beforeAll(async () => {
  ({ ViewportTransform } = await import("./ViewportTransform.ts"));
});

describe("ViewportTransform", () => {
  it("composes zoom and reference transforms and inverts them", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));

    // without zoom
    expect(vt.fromScreenToModelX(50)).toBeCloseTo(5);
    expect(vt.fromScreenToModelY(20)).toBeCloseTo(2);

    // apply zoom: translate 10 and scale 2
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));
    expect(vt.fromScreenToModelX(70)).toBeCloseTo(3);
    expect(vt.fromScreenToModelY(20)).toBeCloseTo(1);
  });

  it("maps screen bases back to model bases through inverse transforms", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const basis = vt.fromScreenToModelBasisX([20, 40]);
    const [p1, p2] = basis;
    expect(p1).toBeCloseTo(0.5);
    expect(p2).toBeCloseTo(1.5);
  });

  it("converts screen points to model points", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const x = vt.fromScreenToModelX(70);
    const y = vt.fromScreenToModelY(20);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(1);
  });

  it("round-trips between screen and model coordinates", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));
    vt.onZoomPan(zoomIdentity.translate(10, 0).scale(2));

    const xScreen = 70;
    const xModel = vt.fromScreenToModelX(xScreen);
    expect(vt.toScreenFromModelX(xModel)).toBeCloseTo(xScreen);

    const yScreen = 20;
    const yModel = vt.fromScreenToModelY(yScreen);
    expect(vt.toScreenFromModelY(yModel)).toBeCloseTo(yScreen);

    const basisScreen: Basis = [20, 40];
    const basisModel = vt.fromScreenToModelBasisX(basisScreen);
    const roundTrip = vt.toScreenFromModelBasisX(basisModel);
    const [p1, p2] = roundTrip;
    expect(p1).toBeCloseTo(20);
    expect(p2).toBeCloseTo(40);
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

  it("throws a helpful error when scale is zero", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));

    vt.onZoomPan(zoomIdentity.scale(0));
    expect(() => vt.fromScreenToModelX(10)).toThrow(/not invertible/);
  });

  it("throws a helpful error when scale is near zero", () => {
    const vt = new ViewportTransform();

    vt.onViewPortResize(toDirectProductBasis([0, 100], [0, 100]));
    vt.onReferenceViewWindowResize(toDirectProductBasis([0, 10], [0, 10]));

    vt.onZoomPan(zoomIdentity.scale(1e-15));
    expect(() => vt.fromScreenToModelX(10)).toThrow(/not invertible/);
  });
});
