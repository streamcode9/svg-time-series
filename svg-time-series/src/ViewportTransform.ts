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

  public onViewPortResize(bScreenVisible: DirectProductBasis): void {
    this.viewPortPoints = bScreenVisible;
    this.updateReferenceTransform();
  }

  public onReferenceViewWindowResize(newPoints: DirectProductBasis) {
    this.referenceViewWindowPoints = newPoints;
    this.updateReferenceTransform();
  }

  public onZoomPan(t: ZoomTransform): void {
    this.zoomTransform = new DOMMatrix().translate(t.x, 0).scale(t.k, 1);
    this.updateComposedMatrix();
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

  public dotScaleMatrix(dotRadius: number) {
    const inv = this.composedMatrix.inverse();
    const tp0 = new DOMPoint(0, 0).matrixTransform(inv);
    const tp1 = new DOMPoint(dotRadius, dotRadius).matrixTransform(inv);
    const dotRadiusXModel = tp0.x - tp1.x;
    const dotRadiusYModel = tp0.y - tp1.y;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    return svg
      .createSVGMatrix()
      .scaleNonUniform(dotRadiusXModel, dotRadiusYModel);
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
