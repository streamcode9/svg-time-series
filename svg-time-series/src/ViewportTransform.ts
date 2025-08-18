import { scaleLinear, type ScaleLinear } from "d3-scale";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import { scalesToDomMatrix } from "./utils/domMatrix.ts";

export class ViewportTransform {
  private baseScaleX = scaleLinear();
  private baseScaleY = scaleLinear();
  private scaleX = this.baseScaleX;
  private scaleY = this.baseScaleY;
  private zoomTransform: ZoomTransform = zoomIdentity;
  private composedMatrix: DOMMatrix = new DOMMatrix();

  private static readonly DET_EPSILON = 1e-12;

  private updateScales() {
    this.scaleX = this.zoomTransform.rescaleX(this.baseScaleX);
    // Ignore the zoom transform for the Y axis so that it always fits the data
    // based on its current domain.
    this.scaleY = this.baseScaleY.copy();
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = scalesToDomMatrix(this.scaleX, this.scaleY);
  }

  public onViewPortResize(
    viewX: readonly [number, number],
    viewY: readonly [number, number],
  ): this {
    this.baseScaleX = this.baseScaleX.copy().range(viewX as [number, number]);
    this.baseScaleY = this.baseScaleY.copy().range(viewY as [number, number]);
    this.updateScales();
    return this;
  }

  public onReferenceViewWindowResize(
    refX: readonly [number, number],
    refY: readonly [number, number],
  ): this {
    this.baseScaleX = this.baseScaleX.copy().domain(refX as [number, number]);
    this.baseScaleY = this.baseScaleY.copy().domain(refY as [number, number]);
    this.updateScales();
    return this;
  }

  public onZoomPan(t: ZoomTransform): this {
    this.zoomTransform = t;
    this.updateScales();
    return this;
  }

  private assertNonDegenerate(scale: ScaleLinear<number, number>) {
    const m = this.composedMatrix;
    const det = m.a * m.d - m.b * m.c;
    const [d0, d1] = scale.domain() as [number, number];
    const [r0, r1] = scale.range() as [number, number];
    if (
      !Number.isFinite(det) ||
      Math.abs(det) < ViewportTransform.DET_EPSILON ||
      !Number.isFinite(d0) ||
      !Number.isFinite(d1) ||
      Math.abs(d1 - d0) < ViewportTransform.DET_EPSILON ||
      !Number.isFinite(r0) ||
      !Number.isFinite(r1) ||
      Math.abs(r1 - r0) < ViewportTransform.DET_EPSILON
    ) {
      throw new Error(
        "ViewportTransform: transformation is degenerate (determinant is zero)",
      );
    }
  }

  public fromScreenToModelX(x: number) {
    this.assertNonDegenerate(this.scaleX);
    return this.scaleX.invert(x);
  }

  public fromScreenToModelY(y: number) {
    this.assertNonDegenerate(this.scaleY);
    return this.scaleY.invert(y);
  }

  public fromScreenToModelBasisX(
    b: readonly [number, number],
  ): [number, number] {
    this.assertNonDegenerate(this.scaleX);
    return [this.scaleX.invert(b[0]), this.scaleX.invert(b[1])];
  }

  public fromScreenToModelBasisY(
    b: readonly [number, number],
  ): [number, number] {
    this.assertNonDegenerate(this.scaleY);
    return [this.scaleY.invert(b[0]), this.scaleY.invert(b[1])];
  }

  public toScreenFromModelX(x: number) {
    this.assertNonDegenerate(this.scaleX);
    return this.scaleX(x);
  }

  public toScreenFromModelY(y: number) {
    return this.scaleY(y);
  }

  public toScreenFromModelBasisX(
    b: readonly [number, number],
  ): [number, number] {
    this.assertNonDegenerate(this.scaleX);
    return [this.scaleX(b[0]), this.scaleX(b[1])];
  }

  public toScreenFromModelBasisY(
    b: readonly [number, number],
  ): [number, number] {
    this.assertNonDegenerate(this.scaleY);
    return [this.scaleY(b[0]), this.scaleY(b[1])];
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
