import { ZoomTransform } from "d3-zoom";
import { AR1Basis, betweenTBasesAR1, bPlaceholder } from "./math/affine.ts";
import { applyAR1ToMatrixX, applyAR1ToMatrixY } from "./viewZoomTransform.ts";

export function composeReferenceMatrix(
  viewPortX: AR1Basis,
  viewPortY: AR1Basis,
  refViewX: AR1Basis,
  refViewY: AR1Basis,
): DOMMatrix {
  const affX = betweenTBasesAR1(refViewX, viewPortX);
  const affY = betweenTBasesAR1(refViewY, viewPortY);
  return applyAR1ToMatrixY(affY, applyAR1ToMatrixX(affX, new DOMMatrix()));
}

export function composeZoomMatrix(t: ZoomTransform): DOMMatrix {
  return new DOMMatrix().translate(t.x, 0).scale(t.k, 1);
}

export class ViewportTransform {
  private viewPortPointsX: AR1Basis = bPlaceholder;
  private viewPortPointsY: AR1Basis = bPlaceholder;

  private referenceViewWindowPointsX: AR1Basis = bPlaceholder;
  private referenceViewWindowPointsY: AR1Basis = bPlaceholder;

  private zoomTransform: DOMMatrix = new DOMMatrix();
  private referenceTransform: DOMMatrix = new DOMMatrix();
  private composedMatrix: DOMMatrix = new DOMMatrix();

  private updateReferenceTransform() {
    this.referenceTransform = composeReferenceMatrix(
      this.viewPortPointsX,
      this.viewPortPointsY,
      this.referenceViewWindowPointsX,
      this.referenceViewWindowPointsY,
    );
    this.updateComposedMatrix();
  }

  private updateComposedMatrix() {
    this.composedMatrix = this.zoomTransform.multiply(this.referenceTransform);
  }

  public onViewPortResize(
    bScreenXVisible: AR1Basis,
    bScreenYVisible: AR1Basis,
  ): void {
    this.viewPortPointsX = bScreenXVisible;
    this.viewPortPointsY = bScreenYVisible;
    this.updateReferenceTransform();
  }

  public onReferenceViewWindowResize(
    newPointsX: AR1Basis,
    newPointsY: AR1Basis,
  ) {
    this.referenceViewWindowPointsX = newPointsX;
    this.referenceViewWindowPointsY = newPointsY;
    this.updateReferenceTransform();
  }

  public onZoomPan(t: ZoomTransform): void {
    this.zoomTransform = composeZoomMatrix(t);
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
    return new DOMMatrix().scale(dotRadiusXModel, dotRadiusYModel);
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
