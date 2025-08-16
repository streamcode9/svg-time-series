import { scaleLinear, type ScaleLinear } from "d3-scale";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";
import type { Basis, DirectProductBasis } from "./basis.ts";
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
    this.scaleY = this.zoomTransform.rescaleY(this.baseScaleY);
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = scalesToDomMatrix(this.scaleX, this.scaleY);
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

  private mapArray<T extends number[]>(b: T, fn: (n: number) => number): T {
    return b.map(fn) as T;
  }

  public fromScreenToModelBasisX(b: Basis): Basis {
    this.assertInvertible(this.scaleX);
    return this.mapArray(b, (n) => this.scaleX.invert(n));
  }

  public toScreenFromModelX(x: number) {
    return this.scaleX(x);
  }

  public toScreenFromModelY(y: number) {
    return this.scaleY(y);
  }

  public toScreenFromModelBasisX(b: Basis): Basis {
    return this.mapArray(b, this.scaleX);
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
