declare const require: Function
const d3 = require('d3')

export class TimeSeriesChart {
	constructor(svg: any, minX: Date, stepX: number, data: any[]) {
		const width = svg.node().parentNode.clientWidth,
			height = svg.node().parentNode.clientHeight
		svg.attr('width', width)
		svg.attr('height', height)

		const color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		const line = d3.line()
			.defined((d: number) => d)
			.x((d: number, i: number) => i)
			.y((d: number) => d)

		const cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.map((d: any) => +d[name])
				})
			})

		const view = svg.append('g')
			.selectAll('.view')
			.data(cities)
			.enter().append('g')
			.attr('class', 'view')

		view.append('path')
			.attr('d', (d: any) => line(d.values))
			.attr('stroke', (d: any) => color(d.name))

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
			const scaleX = width / data.length * 2
			const scaleY = a
			const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
			const translateY = b

			view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)

			if (elapsed > 60 * 1000) timer.stop()
		})
	}
}




