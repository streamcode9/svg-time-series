import { scaleLinear, type ScaleLinear } from "d3-scale";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import type { Basis, DirectProductBasis } from "./basis.ts";
import {
  scalesToDomMatrix,
  zoomTransformToDomMatrix,
} from "./utils/domMatrix.ts";

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
    const baseMatrix = scalesToDomMatrix(this.baseScaleX, this.baseScaleY);
    this.composedMatrix = zoomTransformToDomMatrix(
      this.zoomTransform,
      baseMatrix,
    );
  }

  public onViewPortResize(bScreenVisible: DirectProductBasis): this {
    const [viewX, viewY] = bScreenVisible;
    this.baseScaleX = this.baseScaleX.copy().range(viewX);
    this.baseScaleY = this.baseScaleY.copy().range(viewY);
    this.updateScales();
    return this;
  }

  public onReferenceViewWindowResize(newPoints: DirectProductBasis): this {
    const [refX, refY] = newPoints;
    this.baseScaleX = this.baseScaleX.copy().domain(refX);
    this.baseScaleY = this.baseScaleY.copy().domain(refY);
    this.updateScales();
    return this;
  }

  public onZoomPan(t: ZoomTransform): this {
    this.zoomTransform = t;
    this.updateScales();
    return this;
  }

  private assertInvertible(scale: ScaleLinear<number, number>) {
    const k = this.zoomTransform.k;
    const [d0, d1] = scale.domain() as [number, number];
    if (
      !Number.isFinite(k) ||
      Math.abs(k) < ViewportTransform.DET_EPSILON ||
      !Number.isFinite(d0) ||
      !Number.isFinite(d1) ||
      Math.abs(d1 - d0) < ViewportTransform.DET_EPSILON
    ) {
      throw new Error(
        "ViewportTransform: composed matrix is not invertible (determinant is zero)",
      );
    }
  }

  public fromScreenToModelX(x: number) {
    this.assertInvertible(this.scaleX);
    return this.scaleX.invert(x);
  }

  public fromScreenToModelY(y: number) {
    this.assertInvertible(this.scaleY);
    return this.scaleY.invert(y);
  }

  public fromScreenToModelBasisX(b: Basis): Basis {
    this.assertInvertible(this.scaleX);
    return [this.scaleX.invert(b[0]), this.scaleX.invert(b[1])];
  }

  public toScreenFromModelX(x: number) {
    return this.scaleX(x);
  }

  public toScreenFromModelY(y: number) {
    return this.scaleY(y);
  }

  public toScreenFromModelBasisX(b: Basis): Basis {
    return [this.scaleX(b[0]), this.scaleX(b[1])];
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
