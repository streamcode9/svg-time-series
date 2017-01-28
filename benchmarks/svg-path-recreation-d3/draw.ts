import { scaleLinear, scaleTime, ScaleTime } from 'd3-scale'
import { timer as runTimer } from 'd3-timer'
import { BaseType, ValueFn, selectAll, Selection } from 'd3-selection'
import { Line, line } from 'd3-shape'
import { zoom, ZoomedElementBaseType, zoomIdentity, ZoomTransform } from 'd3-zoom'
import { MyAxis, Orientation } from '../../axis'

export class TimeSeriesChart {
	constructor(svg: Selection<BaseType, {}, HTMLElement, any>, data: number[][], drawLine: (idx: number) => Line<any>) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const x: any = scaleTime().range([0, width])
		const y = scaleLinear().range([height, 0])

		let minX = Date.now() 
		x.domain([minX, (data.length - 1) * 86400000 + minX])
		y.domain([-5, 83])

		const xAxis = new MyAxis(Orientation.Bottom, x)
			.ticks(4)
			.setTickSize(height)
			.setTickPadding(8 - height)

		const yAxis = new MyAxis(Orientation.Right, y)
			.ticks(4)
			.setTickSize(width)
			.setTickPadding(2 - width)

		const gX = svg.append('g')
			.attr('class', 'axis')
			.call(xAxis.axis.bind(xAxis))

		const gY = svg.append('g')
			.attr('class', 'axis')
			.call(yAxis.axis.bind(yAxis))

		const timer = runTimer((elapsed: number) => {
			// Push new data point
			let newData: number[] = data[0]
			data.push(newData)
			data.shift()

			minX += 86400000
			x.domain([minX, (data.length - 1) * 86400000 + minX])

			// Redraw path
			svg.select('.view').selectAll('path').attr('d', (cityIdx: number) => drawLine(cityIdx).call(null, data))

			// Redraw axes
			xAxis.axisUp(gX)

			if (elapsed > 60 * 1000) {
				timer.stop()
			}
		})
	}
}