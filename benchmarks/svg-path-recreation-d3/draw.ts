import { scaleLinear, scaleTime } from 'd3-scale'
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

		const x: any = scaleTime().range([0, width])
		const y = scaleLinear().range([height, 0])

		let minX = Date.now()
		x.domain([minX, (data.length - 1) * 86400000 + minX])
		y.domain([-5, 83])

		const timer = runTimer((elapsed: number) => {
			// Push new data point
			const newData = data[0]
			data.push(newData)
			data.shift()

			minX += 86400000
			x.domain([minX, (data.length - 1) * 86400000 + minX])

			// Redraw path
			svg.select('.view').selectAll('path').attr('d', (cityIdx: number) => drawLine(cityIdx).call(null, data))

			if (elapsed > 60 * 1000) {
				timer.stop()
			}
		})
	}
}
