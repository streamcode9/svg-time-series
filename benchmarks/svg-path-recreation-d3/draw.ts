import { BaseType, selectAll, Selection } from 'd3-selection'
import { Line, line } from 'd3-shape'
import { timer as runTimer } from 'd3-timer'

export class TimeSeriesChart {
	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		data: number[][],
		drawLine: (idx: number) => Line<[number, number]>) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const dataLength = data.length
		const elapsed = 0
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
		const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
		const translateY = b

		paths.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)

		const timer = runTimer((elapsed: number) => {
			// Push new data point
			const newData = data[0]
			data.push(newData)
			data.shift()

			// Redraw path
			paths.attr('d', (cityIdx: number) => drawLine(cityIdx).call(null, data))

			if (elapsed > 60 * 1000) {
				timer.stop()
			}
		})
	}
}
