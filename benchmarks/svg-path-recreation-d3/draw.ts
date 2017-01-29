import { BaseType, selectAll, Selection } from 'd3-selection'
import { Line, line } from 'd3-shape'

import { animateBench } from '../bench'

export class TimeSeriesChart {
	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		dataLength: number,
		drawLine: (idx: number, off: number) => string) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const paths = svg.select('g.view').selectAll('path')

		const minY = -5
		const maxY = 83
		const k = height / (maxY - minY)
		// conceptually viewPortY = a * temperature + b
		// and actually viewPortY = scaleY * lineY + translateY

		// actually it's better to explain what's going on
		// with compositions of rangeTransform(inMin, inMax, outMin, outMax)
		const a = -k
		const b = maxY * k
		const scaleX = width / dataLength * 2
		const scaleY = a
		const translateX = (Math.cos(0 / 6500) - 1) * width / 4
		const translateY = b
		let off = 0

		paths.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)

		animateBench((elapsed: number) => {
			// Redraw path
			paths.attr('d', (cityIdx: number) => drawLine(cityIdx, off))
			off += 1
		})
	}
}
