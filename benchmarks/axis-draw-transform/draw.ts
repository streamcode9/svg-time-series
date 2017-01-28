import { scaleLinear, scaleTime, ScaleTime } from 'd3-scale'
import { BaseType, selectAll, Selection } from 'd3-selection'
import { timer as runTimer } from 'd3-timer'
import { zoom, ZoomedElementBaseType, zoomIdentity, ZoomTransform } from 'd3-zoom'

import { MyAxis, Orientation } from '../../axis'

export class TimeSeriesChart {
	constructor( svg: Selection<BaseType, {}, HTMLElement, any>, dataLength: number) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		const x: any = scaleTime().range([0, width])
		const y = scaleLinear().range([height, 0])

		const minX = Date.now()
		x.domain([minX, (dataLength - 1) * 86400000 + minX])
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
			const minY = -5
			const maxY = 83
			const k = height / (maxY - minY)
			const a = -k
			const b = maxY * k
			const scaleX = width / dataLength * 2
			const scaleY = a
			const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
			const translateY = b

			const zoomTransform: ZoomTransform = zoomIdentity.translate(translateX, translateY).scale(Math.max(scaleX, scaleY))
			const rx = zoomTransform.rescaleX(x)
			const ry = scaleLinear().range([height, 0]).domain(y.domain())
			xAxis.setScale(rx).axisUp(gX)
			yAxis.setScale(ry).axisUp(gY)

			if (elapsed > 60 * 1000) {
				timer.stop()
			}
		})
	}
}
