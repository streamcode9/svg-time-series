import { ZoomedElementBaseType, ZoomTransform, zoom, zoomIdentity } from 'd3-zoom'
import { ScaleTime, scaleTime, scaleLinear } from 'd3-scale'
import { timer as runTimer } from 'd3-timer'
import { Selection, BaseType, selectAll } from 'd3-selection'
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

		const x: any = scaleTime().range([0, width])
		const y = scaleLinear().range([height, 0])

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

		let timer = runTimer((elapsed: number) => {
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
			const zoomElement: Selection<any, any, any, any> = selectAll('.zoom')
			zoom().transform(zoomElement, zoomTransform)
			const rx = zoomTransform.rescaleX(x)
			const ry = scaleLinear().range([height, 0]).domain(y.domain())
			xAxis.setScale(rx).axisUp(gX)
			yAxis.setScale(ry).axisUp(gY)

			if (elapsed > 60 * 1000) timer.stop()
		})
	}
}
