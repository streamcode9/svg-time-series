export class ViewWindowTransform {
  constructor(transform: SVGTransformList) {
    this.VOMatrix = this.newMatrix();
    this.NPCMatrix = this.newMatrix();
    this.PDCMatrix = this.newMatrix();

    this.svgTranformList = transform;
    this.updateVO();
  }

  public setViewPort(width: number, height: number) {
    this.vpxMin = 0;
    this.vpxMax = width;
    this.vpyMin = 0;
    this.vpyMax = height;

    this.updatePDC();
  }

  public setViewWindow(uMin: number, uMax: number, vMin: number, vMax: number) {
    this.uMin = uMin;
    this.uMax = uMax;
    this.vMin = vMin;
    this.vMax = vMax;
    this.updateNPC();
  }

  public calcViewWindow() {
    this.uMin = this.WCX - (this.vpxMax - this.vpxMin) / 2 / this.ViewScale;
    this.uMax = this.WCX + (this.vpxMax - this.vpxMin) / 2 / this.ViewScale;

    this.vMin = this.WCY - (this.vpyMax - this.vpyMin) / 2;
    this.vMax = this.WCY + (this.vpyMax - this.vpyMin) / 2;
  }

  public fromScreenToModel(p: SVGPoint) {
    return p.matrixTransform(this.GeneralMatrix);
  }

  public fromModelToScreen(p: SVGPoint) {
    return p.matrixTransform(this.GeneralMatrixInversed);
  }

  private updateVO() {
    // clear VOMatrix
    this.VOMatrix = this.newMatrix();

    // 1 View Orientation Transformation mc -> viewWindow coordinate system

    // compensate for the difference between base measurement units (MU) and View Window (ruler, grid, snapper) MU
    let scaleToVO = this.newMatrix();
    //        scaleToVO = scaleToVO.scaleNonUniform(1 / this.pxPerSec, 1)
    scaleToVO = scaleToVO.scaleNonUniform(1, 1);

    this.VOMatrix = this.VOMatrix.multiply(scaleToVO);

    //update inversed matrix
    this.VOMatrixInversed = this.VOMatrix.inverse();

    this.updateGeneral();
  }

  private updateNPC() {
    // clear NPCMatrix
    this.NPCMatrix = this.newMatrix();

    // 2 Normalized Projection Coordiantes Transformation

    // 2.1) take into account View Window MU
    let scaleToVOCompensate = this.newMatrix();
    //        scaleToVOCompensate = scaleToVOCompensate.scaleNonUniform(this.pxPerSec, 1)
    scaleToVOCompensate = scaleToVOCompensate.scaleNonUniform(1, 1);

    // 2) translate to the left bottom corner of the view window from the WC (Window Center)
    let translate = this.newMatrix();
    translate = translate.translate(
      -(this.uMax + this.uMin) / 2,
      -(this.vMax + this.vMin) / 2,
    );

    if (this.uMax - this.uMin < 1e-10)
      throw new Error("View Window Width is too small");
    if (this.vMax - this.vMin < 1e-10)
      throw new Error("View Window Height is too small");

    // 3) scale to 1 x 1 "Normalized View Window"
    let scaleToNPC = this.newMatrix();
    scaleToNPC = scaleToNPC.scaleNonUniform(
      1 / (this.uMax - this.uMin),
      1 / (this.vMax - this.vMin),
    );

    this.NPCMatrix = this.NPCMatrix.multiply(scaleToNPC);
    this.NPCMatrix = this.NPCMatrix.multiply(translate);
    this.NPCMatrix = this.NPCMatrix.multiply(scaleToVOCompensate);

    this.updateGeneral();
  }

  private updatePDC() {
    // clear PDCMatrix
    this.PDCMatrix = this.newMatrix();

    // 3 Projection Device Coordinates Transformation

    // 3.1) invert Y axis (from cartesian coordinates to device coordiantes)
    let YAxisInvert = this.newMatrix();
    YAxisInvert = YAxisInvert.scaleNonUniform(1.0, -1.0);

    // 3.2) translate bottom left corner of the canonical window (1x1 window) to the Top Left corner - the origin of the device coordiante system

    let TranslateToTopLeft = this.newMatrix();
    TranslateToTopLeft = TranslateToTopLeft.translate(0.5, 0.5);

    // 3.3) scale from canonical 1x1 dimension window to the view port actual width and height window
    let scaleToPdc = this.newMatrix();
    scaleToPdc = scaleToPdc.scaleNonUniform(
      this.vpxMax - this.vpxMin,
      this.vpyMax - this.vpyMin,
    );

    this.PDCMatrix = this.PDCMatrix.multiply(scaleToPdc);
    this.PDCMatrix = this.PDCMatrix.multiply(TranslateToTopLeft);
    this.PDCMatrix = this.PDCMatrix.multiply(YAxisInvert);

    this.updateGeneral();
  }

  private updateGeneral() {
    this.GeneralMatrix = this.newMatrix();

    this.GeneralMatrix = this.GeneralMatrix.multiply(this.PDCMatrix);
    this.GeneralMatrix = this.GeneralMatrix.multiply(this.NPCMatrix);
    this.GeneralMatrix = this.GeneralMatrix.multiply(this.VOMatrix);

    // update inversed matrix
    this.GeneralMatrixInversed = this.newMatrix();
    this.GeneralMatrixInversed = this.GeneralMatrix.inverse();

    const generalTransform = this.svgTranformList.createSVGTransformFromMatrix(
      this.GeneralMatrix,
    );
    this.svgTranformList.initialize(generalTransform);
  }

  //public CombineGeneralTransformation() {

  //    let translate = this.newMatrix()
  //    translate = translate.translate(-(this.uMax + this.uMin) / 2, -(this.vMax + this.vMin) / 2)

  //    // 3) scale to 1 x 1 "Normalized View Window"
  //    let scaleToNPC = this.newMatrix()
  //    scaleToNPC = scaleToNPC.scaleNonUniform(1 / (this.uMax - this.uMin), 1 / (this.vMax - this.vMin))

  //    let YAxisInvert = this.newMatrix()
  //    YAxisInvert = YAxisInvert.scaleNonUniform(1.0, -1.0)

  //    // 3.2) translate bottom left corner of the canonical window (1x1 window) to the Top Left corner - the origin of the device coordiante system

  //    let TranslateToTopLeft = this.newMatrix()
  //    TranslateToTopLeft = TranslateToTopLeft.translate(0.5, 0.5)

  //    // 3.3) scale from canonical 1x1 dimension window to the view port actual width and height window
  //    let scaleToPdc = this.newMatrix()
  //    scaleToPdc = scaleToPdc.scaleNonUniform(this.vpxMax - this.vpxMin, this.vpyMax - this.vpyMin)

  //    this.svgTranformList.clear()
  //    this.svgTranformList.appendItem(this.ToTransform(scaleToPdc))
  //    this.svgTranformList.appendItem(this.ToTransform(TranslateToTopLeft))
  //    this.svgTranformList.appendItem(this.ToTransform(YAxisInvert))
  //    this.svgTranformList.appendItem(this.ToTransform(scaleToNPC))
  //    this.svgTranformList.appendItem(this.ToTransform(translate))
  //}

  private newMatrix() {
    return this._SVG.createSVGMatrix();
  }

  private ToTransform(matrix: SVGMatrix) {
    const t = this._SVG.createSVGTransform();
    t.setMatrix(matrix);
    return t;
  }

  private _SVG: SVGSVGElement = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg",
  );

  private VOMatrix: SVGMatrix;
  private NPCMatrix: SVGMatrix;
  private PDCMatrix: SVGMatrix;

  private GeneralMatrix: SVGMatrix;
  private VOMatrixInversed: SVGMatrix;
  private GeneralMatrixInversed: SVGMatrix;

  private pxPerSec = 96 / 25; // 96 px / 25 sec

  private uMin: number;
  private uMax: number;
  private vMin: number;
  private vMax: number;

  private vpxMax: number;
  private vpxMin: number;
  private vpyMax: number;
  private vpyMin: number;

  private WCX: number;
  private WCY: number;

  private ViewScale: number = 1.0;

  private svgTranformList: SVGTransformList;
}
