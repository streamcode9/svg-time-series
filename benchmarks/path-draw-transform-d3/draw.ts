declare const require: Function
const d3 = require('d3')

export class TimeSeriesChart {
	constructor(svg: any, minX: Date, stepX: number, cities: any, onPath: Function, dataLength: number) {
		const width = svg.node().parentNode.clientWidth,
			height = svg.node().parentNode.clientHeight
		svg.attr('width', width)
		svg.attr('height', height)
		
		const view = svg.append('g')
			.selectAll('.view')
			.data(cities)
			.enter().append('g')
			.attr('class', 'view')

		onPath(view.append('path'))

		let timer = d3.timer((elapsed: number) => {
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




