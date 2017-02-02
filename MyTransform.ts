import { ZoomTransform } from 'd3-zoom'

import { betweenBasesAR1 } from './viewZoomTransform'

export class MyTransform {

	private viewPortPointsX: [number, number]
	private viewPortPointsY: [number, number]

	private referenceViewWindowPointsX: [number, number]
	private referenceViewWindowPointsY: [number, number]

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
		this.viewPortPointsX = [0, 1]
		this.viewPortPointsY = [0, 1]
		this.referenceViewWindowPointsX = [0, 1]
		this.referenceViewWindowPointsY = [0, 1]
	}

	private updateReferenceTransform()  {
		const affX = betweenBasesAR1(this.referenceViewWindowPointsX, this.viewPortPointsX)
		const affY = betweenBasesAR1(this.referenceViewWindowPointsY, this.viewPortPointsY)
		this.referenceTransform = affY.applyToMatrixY(affX.applyToMatrixX(this.identityTransform))
	}

	public onViewPortResize(newWidth: number, newHeight: number) : void {
		this.viewPortPointsX = [0, newWidth]
		this.viewPortPointsY = [newHeight, 0]
		this.updateReferenceTransform()
	}

	public onReferenceViewWindowResize(newPointsX: [number, number], newPointsY: [number, number]) {
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

