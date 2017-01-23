declare const require: Function
const d3 = require('d3')

interface IChartData {
	name: string
	values: number[]
}

interface IChartParameters {
	x: Function
	y: Function
	rx: Function
	ry: Function
	view: any
	data: IChartData[]
	height: number
	line: Function
	color: Function
}

function drawProc(f: any) {
	let requested = false

	return function (...params: any[]) {
		if (!requested) {
			requested = true
			d3.timeout(function (time: any) {
				requested = false
				f(params)
			})
		}
	}
}

export class TimeSeriesChart {
	private chart: IChartParameters
	private minX: Date
	private maxX: Date
	private missedStepsCount: number
	private stepX: number

	constructor(svg: any, minX: Date, stepX: number, data: any[]) {
		this.stepX = stepX
		this.minX = minX
		this.maxX = this.calcDate(data.length - 1, minX)

		this.drawChart(svg, data)

		this.missedStepsCount = 0
	}

	private drawChart(svg: any, data: any[]) {
		const width = svg.node().parentNode.clientWidth,
			height = svg.node().parentNode.clientHeight
		svg.attr('width', width)
		svg.attr('height', height)

		const x = d3.scaleTime().range([0, width])
		const y = d3.scaleLinear().range([height, 0])
		const color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		const line = d3.line()
			.defined((d: number) => d)
			.x((d: number, i: number) => x(this.calcDate(i, this.minX)))
			.y((d: number) => d)

		const cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.map((d: any) => +d[name])
				})
			})

		x.domain([this.minX, this.maxX])
		y.domain([5, 85])

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
			// conceptually y = a * temperature + b
			const a = -k
			const b = maxY * k
			
			const scaleX = 2
			const scaleY = a
			const translateX = (Math.cos(elapsed / 6500) - 1) * width / 4
			const translateY = b

			this.chart.view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)
		})

	}


	private calcDate(index: number, offset: Date) {
		return new Date(index * this.stepX + offset.getTime())
	}
}


export function drawCharts(data: any[]) {
	const charts: TimeSeriesChart[] = []

	d3.selectAll('svg').select(function () {
		const chart = new TimeSeriesChart(d3.select(this), new Date(), 86400000, data)
		charts.push(chart)
	})


}


