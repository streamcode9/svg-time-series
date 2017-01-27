declare const require: Function

const d3 = require('d3')
import d3timer = require('d3-timer')
import { Selection, BaseType } from 'd3-selection'
import { Orientation, MyAxis } from '../../axis'

export class TimeSeriesChart {
	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		dataLength: number)
	{
		const node: SVGSVGElement = <SVGSVGElement>svg.node()
		const div: HTMLElement = <HTMLElement>node.parentNode

		const width = div.clientWidth,
			height = div.clientHeight

		const x = d3.scaleTime().range([0, width])
		const y = d3.scaleLinear().range([height, 0])

		const minX = new Date()
		x.domain([minX, new Date((dataLength - 1) * 86400000 + minX.getTime())])
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

		let timer = d3timer.timer((elapsed: number) => {
			const minY = -5
			const maxY = 83
			const k = height / (maxY - minY)
			const a = -k
			const b = maxY * k
			const scaleX = width / dataLength * 2
			const scaleY = a
			const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
			const translateY = b

			const zoomTransform = d3.zoomIdentity.translate(translateX, translateY).scale(Math.max(scaleX, scaleY))
			d3.zoom().transform(d3.selectAll('.zoom'), zoomTransform)
			const rx = zoomTransform.rescaleX(x)
			const ry = d3.scaleLinear().range([height, 0]).domain(y.domain())
			xAxis.setScale(rx).axisUp(gX)
			yAxis.setScale(ry).axisUp(gY)

			if (elapsed > 60 * 1000) timer.stop()
		})
	}
}
