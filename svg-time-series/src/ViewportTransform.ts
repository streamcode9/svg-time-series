import { ZoomTransform } from "d3-zoom";
import {
  AR1Basis,
  DirectProductBasis,
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
    return new DOMPoint(x, y).matrixTransform(this.composedMatrix.inverse());
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
