import d3timer = require('d3-timer')
import { Selection, BaseType } from 'd3-selection'

export class TimeSeriesChart {
	constructor(
		svg: Selection<BaseType, {}, HTMLElement, any>,
		cities: [number, number],
		onPath: (a: any) => void,
		dataLength: number)
	{

		const node: SVGSVGElement = <SVGSVGElement>svg.node()
		const div: HTMLElement = <HTMLElement>node.parentNode

		const width = div.clientWidth,
			height = div.clientHeight
		svg.attr('width', width)
		svg.attr('height', height)
		
		const view = svg.append('g')
			.selectAll('path')
			.data(cities)
			.enter().append('g')
			.attr('class', 'view')

		onPath(view.append('path'))

		let timer = d3timer.timer((elapsed: number) => {
			const minY = -5
			const maxY = 85	
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

			if (elapsed > 60 * 1000) timer.stop()
		})
	}
}




