// viewZoomTransform состоит из двух этапов:
// - viewTransform трансформирует референсый вьюпорт в модельных
//   в референсный вьюпорт в экранных
// - zoomTransform трансформирует 
//
//
//
// - "мод:ельный" вьюпорт - перемещается зумом
// - "референсный модельный" вьюпорт - постоянен
// - "экранный" вьюпорт - постоянен

//screenCorner * revZoom * revView = modelCorner
//

// автоморфизмы числовой прямой
class AR1 {
	// коэффициенты автоморфизма x' = x * m[0] + m[1]
	public m : [number, number]

	constructor(mm: [number, number]) {
		this.m = mm
	}

	public composeWith(a2: AR1) : AR1 {
		const [a0, b0] = this.m
		const [a1, b1]  = a2.m
		
		return new AR1([a0 * a1, b0 * a1 + b1])
	}

	// x1 = a * x + b; x = x1 / a - b / a
	public inverse() : AR1 {
		const [a, b] = this.m
		return new AR1([1/a, -b / a])
	}

	public applyToMatrixX(sm: SVGMatrix) : SVGMatrix {
		const [a, b] = this.m
		return sm.translate(b, 0).scaleNonUniform(a, 1)
	}
}
//		 b21 - b22        b12 b21 - b11 b22
// [[a = ---------, b = - -----------------]]
//  	 b11 - b12            b11 - b12
function betweenBasesAR1(b1 : [number, number], b2: [number, number]) : AR1 {
	const [b11, b12] = b1
	const [b21, b22] = b2
	return new AR1([(b21 - b22) / (b11 - b12), - (b12 * b21 - b11 * b22) / (b11 - b12)])
}

export function updateNode(n: SVGGElement, m: SVGMatrix) {
	const svgTranformList = n.transform.baseVal
	const t = svgTranformList.createSVGTransformFromMatrix(m)
    svgTranformList.initialize(t)
}

export function test(svgNode: SVGSVGElement, viewNode: SVGGElement, width: number)
{
	const id = svgNode.createSVGMatrix()
	const affX = betweenBasesAR1([-550, 550], [0, width])

	const m = affX.applyToMatrixX(id)

	const newPoint = (x: number, y: number) => {
		const p = svgNode.createSVGPoint()
		p.x = x
		p.y = y
		return p
	}

	return (zoomMatrix: SVGMatrix) => {
		const zoomed = zoomMatrix.multiply(m)

		const rev = zoomed.inverse()
		const pp = newPoint(0,0).matrixTransform(rev)
		document.getElementById("misc").textContent = `${pp.x}`

		updateNode(viewNode, zoomed)
	}
}
