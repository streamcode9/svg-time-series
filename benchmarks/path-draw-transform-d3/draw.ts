import d3timer = require('d3-timer')
import { BaseType, Selection } from 'd3-selection'

export class TimeSeriesChart {
	constructor( svg: Selection<BaseType, {}, HTMLElement, any>, dataLength: number) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const view = svg.select('g')

		const timer = d3timer.timer((elapsed: number) => {
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
			const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
			const translateY = b

			view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)

			if (elapsed > 60 * 1000) {
				timer.stop()
			}
		})
	}
}
