// viewZoomTransform состоит из двух этапов:
// - viewTransform трансформирует референсый вьюпорт в модельных
//   в референсный вьюпорт в экранных
// - zoomTransform трансформирует
//
// - "модельный" вьюпорт - перемещается зумом
// - "референсный модельный" вьюпорт - постоянен
// - "экранный" вьюпорт - постоянен

//screenCorner * revZoom * revView = modelCorner
//

import { ZoomTransform } from "d3-zoom";

import {
  AR1Basis,
  betweenTBasesAR1,
  bPlaceholder,
} from "./math/affine.ts";

import {
  applyAR1ToMatrixX,
  applyAR1ToMatrixY,
  updateNode,
} from "./viewZoomTransform.ts";

export class MyTransform {
  private viewPortPointsX: AR1Basis;
  private viewPortPointsY: AR1Basis;

  private referenceViewWindowPointsX: AR1Basis;
  private referenceViewWindowPointsY: AR1Basis;

  private identityTransform: SVGMatrix;
  private referenceTransform: SVGMatrix;
  private zoomTransform: SVGMatrix;
  private svgNode: SVGSVGElement;

  private viewNode: SVGGElement;

  constructor(svgNode: SVGSVGElement, viewNode: SVGGElement) {
    this.identityTransform = svgNode.createSVGMatrix();
    this.viewNode = viewNode;
    this.svgNode = svgNode;
    this.zoomTransform = this.identityTransform;
    this.referenceTransform = this.identityTransform;
    this.viewPortPointsX = bPlaceholder;
    this.viewPortPointsY = bPlaceholder;
    this.referenceViewWindowPointsX = bPlaceholder;
    this.referenceViewWindowPointsY = bPlaceholder;
  }

  private updateReferenceTransform() {
    const affX = betweenTBasesAR1(
      this.referenceViewWindowPointsX,
      this.viewPortPointsX,
    );
    const affY = betweenTBasesAR1(
      this.referenceViewWindowPointsY,
      this.viewPortPointsY,
    );
    this.referenceTransform = applyAR1ToMatrixY(
      affY,
      applyAR1ToMatrixX(affX, this.identityTransform),
    );
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

  public updateViewNode() {
    updateNode(
      this.viewNode,
      this.zoomTransform.multiply(this.referenceTransform),
    );
  }

  public onZoomPan(t: ZoomTransform): void {
    this.zoomTransform = this.identityTransform
      .translate(t.x, 0)
      .scaleNonUniform(t.k, 1);
  }

  public fromScreenToModelX(x: number) {
    const fwd = this.zoomTransform.multiply(this.referenceTransform);
    const bwd = fwd.inverse();

    const p = this.svgNode.createSVGPoint();
    p.x = x;
    p.y = 0; // irrelevant
    return p.matrixTransform(bwd).x;
  }

  public fromScreenToModelY(y: number) {
    const fwd = this.zoomTransform.multiply(this.referenceTransform);
    const bwd = fwd.inverse();

    const p = this.svgNode.createSVGPoint();
    p.x = 0; // irrelevant
    p.y = y;
    return p.matrixTransform(bwd).y;
  }

  public dotScaleMatrix(dotRadius: number) {
    const fwd = this.zoomTransform.multiply(this.referenceTransform);
    const bwd = fwd.inverse();

    const p0 = this.svgNode.createSVGPoint();
    p0.x = 0;
    p0.y = 0;
    const tp0 = p0.matrixTransform(bwd);

    const p1 = this.svgNode.createSVGPoint();
    p1.x = dotRadius;
    p1.y = dotRadius;
    const tp1 = p1.matrixTransform(bwd);

    const dotRadiusXModel = tp0.x - tp1.x;
    const dotRadiusYModel = tp0.y - tp1.y;

    return this.identityTransform.scaleNonUniform(
      dotRadiusXModel,
      dotRadiusYModel,
    );
  }

  public fromScreenToModelBasisX(b: AR1Basis) {
    const fwd = this.zoomTransform.multiply(this.referenceTransform);
    const bwd = fwd.inverse();

    const p = this.svgNode.createSVGPoint();
    p.y = 0; // irrelevant

    const transformPoint = (x: number) => {
      p.x = x;
      return p.matrixTransform(bwd).x;
    };
    const [p1, p2] = b.toArr().map(transformPoint);
    return new AR1Basis(p1, p2);
  }
}
