import d3timer = require('d3-timer')
import { BaseType, Selection } from 'd3-selection'
import { IMinMax, SegmentTree } from '../../segmentTree'

function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
	const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0]
	const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0]
	const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1]
	const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

export class TimeSeriesChart {
	constructor( svg: Selection<BaseType, {}, HTMLElement, any>, data: number[][]) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const view = svg.select('g')

		const tree = new SegmentTree(data, data.length, buildSegmentTreeTuple)

		const timer = d3timer.timer((elapsed: number) => {
			const minMax = tree.getMinMax(0, tree.size - 1)
			const minY = minMax.min
			const maxY = minMax.max
			const k = height / (maxY - minY)
			// conceptually viewPortY = a * temperature + b
			// and actually viewPortY = scaleY * lineY + translateY

			// actually it's better to explain what's going on
			// with compositions of rangeTransform(inMin, inMax, outMin, outMax)
			const a = -k
			const b = maxY * k
			const scaleX = width / data.length * 2
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