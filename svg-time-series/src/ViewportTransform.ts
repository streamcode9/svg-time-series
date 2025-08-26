import { scaleLinear, type ScaleLinear } from "d3-scale";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import { scalesToDomMatrix } from "./utils/domMatrix.ts";

export class ViewportTransform {
  private baseScaleX = scaleLinear();
  private baseScaleY = scaleLinear();
  private _scaleX = this.baseScaleX;
  private _scaleY = this.baseScaleY;
  private zoomTransform: ZoomTransform = zoomIdentity;
  private composedMatrix: DOMMatrix = new DOMMatrix();

  private static readonly EPSILON = 1e-12;

  private updateScales() {
    this._scaleX = this.zoomTransform.rescaleX(this.baseScaleX);
    // Ignore the zoom transform for the Y axis so that it always fits the data
    // based on its current domain.
    this._scaleY = this.baseScaleY.copy();
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = scalesToDomMatrix(this._scaleX, this._scaleY);
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
    const [d0, d1] = scale.domain() as [number, number];
    const [r0, r1] = scale.range() as [number, number];
    if (
      !Number.isFinite(d0) ||
      !Number.isFinite(d1) ||
      Math.abs(d1 - d0) < ViewportTransform.EPSILON ||
      !Number.isFinite(r0) ||
      !Number.isFinite(r1) ||
      Math.abs(r1 - r0) < ViewportTransform.EPSILON
    ) {
      throw new Error("ViewportTransform: scale is degenerate");
    }
  }

  public get scaleX(): ScaleLinear<number, number> {
    this.assertNonDegenerate(this._scaleX);
    return this._scaleX;
  }

  public get scaleY(): ScaleLinear<number, number> {
    this.assertNonDegenerate(this._scaleY);
    return this._scaleY;
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
