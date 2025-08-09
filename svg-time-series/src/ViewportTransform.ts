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
    this.zoomTransform = new DOMMatrix().scale(t.k, 1).translate(t.x, 0);
    this.updateComposedMatrix();
    return this;
  }

  private toModelPoint(x: number, y: number) {
    return new DOMPoint(x, y).matrixTransform(this.composedMatrix.inverse());
  }

  public fromScreenToModelX(x: number) {
    return this.toModelPoint(x, 0).x;
  }

  public fromScreenToModelY(y: number) {
    return this.toModelPoint(0, y).y;
  }

  public fromScreenToModelBasisX(b: AR1Basis) {
    const transformPoint = (x: number) => this.toModelPoint(x, 0).x;
    const [p1, p2] = b.toArr().map(transformPoint);
    return new AR1Basis(p1, p2);
  }

  public get matrix(): DOMMatrix {
    return this.composedMatrix;
  }
}
