import { scaleLinear } from "d3-scale";
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
  private inverseMatrix: DOMMatrix | null = new DOMMatrix();

  private static readonly DET_EPSILON = 1e-12;

  private updateScales() {
    this.scaleX = this.zoomTransform.rescaleX(this.baseScaleX);
    this.scaleY = this.zoomTransform.rescaleY(this.baseScaleY);
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = scalesToDomMatrix(
      this.scaleX,
      this.scaleY,
      new DOMMatrix(),
    );
    this.updateInverseMatrix();
  }

  private updateInverseMatrix() {
    const m = this.composedMatrix;
    if (!m.is2D) {
      this.inverseMatrix = null;
      return;
    }

    const det = m.a * m.d - m.b * m.c;
    if (
      !Number.isFinite(det) ||
      Math.abs(det) < ViewportTransform.DET_EPSILON
    ) {
      this.inverseMatrix = null;
      return;
    }

    this.inverseMatrix = m.inverse();
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

  private toModelPoint(x: number, y: number) {
    if (!this.inverseMatrix) {
      throw new Error(
        "ViewportTransform: composed matrix is not invertible (determinant is zero)",
      );
    }
    return new DOMPoint(x, y).matrixTransform(this.inverseMatrix);
  }

  private toScreenPoint(x: number, y: number) {
    return new DOMPoint(x, y).matrixTransform(this.composedMatrix);
  }

  public fromScreenToModelX(x: number) {
    return this.toModelPoint(x, 0).x;
  }

  public fromScreenToModelY(y: number) {
    return this.toModelPoint(0, y).y;
  }

  public fromScreenToModelBasisX(b: Basis): Basis {
    const transformPoint = (x: number) => this.toModelPoint(x, 0).x;
    const [bp1, bp2] = b;
    const p1 = transformPoint(bp1);
    const p2 = transformPoint(bp2);
    return [p1, p2];
  }

  public toScreenFromModelX(x: number) {
    return this.toScreenPoint(x, 0).x;
  }

  public toScreenFromModelY(y: number) {
    return this.toScreenPoint(0, y).y;
  }

  public toScreenFromModelBasisX(b: Basis): Basis {
    const transformPoint = (x: number) => this.toScreenPoint(x, 0).x;
    const [bp1, bp2] = b;
    const p1 = transformPoint(bp1);
    const p2 = transformPoint(bp2);
    return [p1, p2];
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
