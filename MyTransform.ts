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

import { ZoomTransform } from 'd3-zoom'

import { betweenBasesAR1, betweenTBasesAR1, AR1Basis } from './viewZoomTransform'

export class MyTransform {
	private viewPortPointsX: AR1Basis
	private viewPortPointsY: AR1Basis

	private referenceViewWindowPointsX: AR1Basis
	private referenceViewWindowPointsY: AR1Basis

	private identityTransform: SVGMatrix
	private referenceTransform: SVGMatrix
	private zoomTransform: SVGMatrix
	private svgNode: SVGSVGElement

	private viewNode: SVGGElement

	constructor(svgNode: SVGSVGElement, viewNode: SVGGElement) {
		this.identityTransform = svgNode.createSVGMatrix()
		this.viewNode = viewNode
		this.svgNode = svgNode
		this.zoomTransform = this.identityTransform
		this.referenceTransform = this.identityTransform
		this.viewPortPointsX = new AR1Basis(0, 1)
		this.viewPortPointsY = new AR1Basis(0, 1)
		this.referenceViewWindowPointsX = new AR1Basis(0, 1)
		this.referenceViewWindowPointsY = new AR1Basis(0, 1)
	}

	private updateReferenceTransform()  {
		const affX = betweenTBasesAR1(this.referenceViewWindowPointsX, this.viewPortPointsX)
		const affY = betweenTBasesAR1(this.referenceViewWindowPointsY, this.viewPortPointsY)
		this.referenceTransform = affY.applyToMatrixY(affX.applyToMatrixX(this.identityTransform))
	}

	public onViewPortResize(newWidth: number, newHeight: number) : void {
		this.viewPortPointsX = new AR1Basis(0, newWidth)
		// ось Y перевернута - что выглядит на языке
		// базисов как перевернутый базис
		//
		// а на языке векторов как разность точек, которая
		// у X положительна а у Y отрицательна
		// ну и наоборот если перевернем первый базис
		// то второй тоже перевернется но переворачивание
		// по-прежнему выглядит как умножение разности на -1
		//	
		// короче неважно какой из них считать первичным
		// в любом случае один перевернут по отношению к другому
		this.viewPortPointsY = new AR1Basis (newHeight, 0)
		this.updateReferenceTransform()
	}

	public onReferenceViewWindowResize(newPointsX: AR1Basis, newPointsY: AR1Basis) {
		this.referenceViewWindowPointsX = newPointsX
		this.referenceViewWindowPointsY = newPointsY
		this.updateReferenceTransform()
	}

	public updateViewNode() {
		updateNode(this.viewNode, this.zoomTransform.multiply(this.referenceTransform))
	}

	public onZoomPan(t: ZoomTransform) : void {
		this.zoomTransform = this.identityTransform.translate(t.x, 0).scaleNonUniform(t.k, 1)
	}

	public fromScreenToModelX(x: number) {
		const fwd = this.zoomTransform.multiply(this.referenceTransform)
		const bwd = fwd.inverse()

		const p = this.svgNode.createSVGPoint()
		p.x = x
		p.y = 0 // irrelevant
		return p.matrixTransform(bwd).x
	}
}

export function updateNode(n: SVGGElement, m: SVGMatrix) {
	const svgTranformList = n.transform.baseVal
	const t = svgTranformList.createSVGTransformFromMatrix(m)
    svgTranformList.initialize(t)
}

