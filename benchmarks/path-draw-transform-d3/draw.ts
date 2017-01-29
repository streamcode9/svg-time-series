import { BaseType, Selection } from 'd3-selection'

import { animateBench } from '../bench'
import { ViewWindowTransform } from '../viewing-pipeline-transformations/ViewWindowTransform'

function raisedCos(elapsed: number) {
	return -(Math.cos(elapsed / 6500) - 1) / 2
}

function animateCosDown(maxX: number, minX: number, elapsed: number) {
	return maxX - (maxX - minX) * raisedCos(elapsed)
}

export class TimeSeriesChart {
	constructor( svg: Selection<BaseType, {}, HTMLElement, any>, dataLength: number) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const view = svg.select('g')

		const viewNode: SVGGElement = view.node() as SVGGElement
		const t = new ViewWindowTransform(viewNode.transform.baseVal)

		t.setViewPort(width, height)

		animateBench((elapsed: number) => {
			const minY = -5
			const maxY = 83
			const minX = animateCosDown(dataLength / 2, 0, elapsed)
			const maxX = minX + dataLength / 2
			t.setViewWindow(minX, maxX, minY, maxY)
		})
	}
}
