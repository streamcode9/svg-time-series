import { BaseType, selectAll, Selection } from 'd3-selection'
import { Line, line } from 'd3-shape'

import { animateBench, animateCosDown } from '../bench'
import { ViewWindowTransform } from '../viewing-pipeline-transformations/ViewWindowTransform'

export class TimeSeriesChart {
	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		dataLength: number,
		drawLine: (idx: number, off: number) => string) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement
		const viewNode: SVGGElement = svg.select('g').node() as SVGGElement
		const t = new ViewWindowTransform(viewNode.transform.baseVal)
		t.setViewPort(div.clientWidth, div.clientHeight)

		const minY = -5
		const maxY = 83
		const minX = animateCosDown(dataLength / 2, 0, 0)
		const maxX = minX + dataLength / 2
		t.setViewWindow(minX, maxX, minY, maxY)

		const paths = svg.select('g.view').selectAll('path')

		let off = 0
		animateBench((elapsed: number) => {
			// Redraw path
			paths.attr('d', (cityIdx: number) => drawLine(cityIdx, off))
			off += 1
		})
	}
}
