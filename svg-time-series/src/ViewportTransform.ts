import type { ZoomTransform } from "d3-zoom";
import type { DirectProductBasis } from "./math/affine.ts";
import {
  AR1Basis,
  betweenTBasesDirectProduct,
  dpbPlaceholder,
} from "./math/affine.ts";
import { applyDirectProductToMatrix } from "./utils/domMatrix.ts";

export class ViewportTransform {
  private viewPortPoints: DirectProductBasis = dpbPlaceholder;

  private referenceViewWindowPoints: DirectProductBasis = dpbPlaceholder;

  private zoomTransform: DOMMatrix = new DOMMatrix();
  private referenceTransform: DOMMatrix = new DOMMatrix();
  private composedMatrix: DOMMatrix = new DOMMatrix();
  private inverseMatrix: DOMMatrix | null = new DOMMatrix();

  private static readonly DET_EPSILON = 1e-12;

  private updateReferenceTransform() {
    const dp = betweenTBasesDirectProduct(
      this.referenceViewWindowPoints,
      this.viewPortPoints,
    );
    this.referenceTransform = applyDirectProductToMatrix(dp, new DOMMatrix());
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = this.zoomTransform.multiply(this.referenceTransform);
    this.updateInverseMatrix();
  }

  private updateInverseMatrix() {
    const m = this.composedMatrix;
    if (!m.is2D) {
      this.inverseMatrix = null;
      return;
    }

    const det = m.a * m.d - m.b * m.c;
    if (Math.abs(det) < ViewportTransform.DET_EPSILON) {
      this.inverseMatrix = null;
      return;
    }

    this.inverseMatrix = m.inverse();
  }

  public onViewPortResize(bScreenVisible: DirectProductBasis): this {
    this.viewPortPoints = bScreenVisible;
    this.updateReferenceTransform();
    return this;
  }

  public onReferenceViewWindowResize(newPoints: DirectProductBasis): this {
    this.referenceViewWindowPoints = newPoints;
    this.updateReferenceTransform();
    return this;
  }

  public onZoomPan(t: ZoomTransform): this {
    this.zoomTransform = new DOMMatrix().translate(t.x, 0).scale(t.k, 1);
    this.updateComposedMatrix();
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

  public fromScreenToModelBasisX(b: AR1Basis) {
    const transformPoint = (x: number) => this.toModelPoint(x, 0).x;
    const [bp1, bp2] = b.toArr();
    const p1 = transformPoint(bp1);
    const p2 = transformPoint(bp2);
    return new AR1Basis(p1, p2);
  }

  public toScreenFromModelX(x: number) {
    return this.toScreenPoint(x, 0).x;
  }

  public toScreenFromModelY(y: number) {
    return this.toScreenPoint(0, y).y;
  }

  public toScreenFromModelBasisX(b: AR1Basis) {
    const transformPoint = (x: number) => this.toScreenPoint(x, 0).x;
    const [bp1, bp2] = b.toArr();
    const p1 = transformPoint(bp1);
    const p2 = transformPoint(bp2);
    return new AR1Basis(p1, p2);
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
