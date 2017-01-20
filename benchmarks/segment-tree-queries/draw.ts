declare const require: Function
const d3 = require('d3')
import axis = require('../../axis')
import segmentTree = require('../../segmentTree')

interface IChartData {
	name: string
	values: number[]
}

interface IChartParameters {
	x: Function
	y: Function 
	rx: Function
	ry: Function
	xAxis: axis.MyAxis
	yAxis: axis.MyAxis
	gX: any
	gY: any
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
	private tree: segmentTree.SegmentTree
	private buildSegmentTreeTuple: (index: number, elements: any) => segmentTree.IMinMax
	private zoomHandler: () => void

	constructor(svg: any, minX: Date, stepX: number, data: any[], buildSegmentTreeTuple: (index: number, elements: any) => segmentTree.IMinMax, zoomHandler: () => void) {
		this.stepX = stepX
		this.minX = minX
		this.maxX = this.calcDate(data.length - 1, minX)
		this.buildSegmentTreeTuple = buildSegmentTreeTuple
		this.zoomHandler = zoomHandler

		this.drawChart(svg, data)

		this.missedStepsCount = 0
	}

	public zoom = drawProc(function(param: any[]) {
		const zoomTransform = param[0]
		d3.zoom().transform(d3.selectAll('.zoom'), zoomTransform)
		const translateX = zoomTransform.x
		const scaleX = zoomTransform.k

		this.chart.rx = zoomTransform.rescaleX(this.chart.x)
		const domainX = this.chart.rx.domain()
		const ySubInterval = this.getZoomIntervalY(domainX, this.chart.data[0].values.length)
		const minMax = this.tree.getMinMax(ySubInterval[0], ySubInterval[1])
		const domainY = [minMax.min, minMax.max]
		const newRangeY = [this.chart.y(domainY[0]), this.chart.y(domainY[1])]
		const oldRangeY = this.chart.y.range()
		const scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1])
		const translateY = scaleY * (oldRangeY[1] - newRangeY[1])
		const ry = d3.scaleLinear().range([this.chart.height, 0]).domain(domainY)

		this.chart.view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)
		this.chart.xAxis.setScale(this.chart.rx).axisUp(this.chart.gX)
		this.chart.yAxis.setScale(ry).axisUp(this.chart.gY)
	}.bind(this))

	private drawChart(svg: any, data: any[]) {
		const width = svg.node().parentNode.clientWidth,
			height = svg.node().parentNode.clientHeight
		svg.attr('width', width)
		svg.attr('height', height)

		const x = d3.scaleTime().range([0, width])
		const y = d3.scaleLinear().range([height, 0])
		const color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		const xAxis = new axis.MyAxis(axis.Orientation.Bottom, x)
			.ticks(4)
			.setTickSize(height)
			.setTickPadding(8 - height)

		const yAxis = new axis.MyAxis(axis.Orientation.Right, y)
			.ticks(4)
			.setTickSize(width)
			.setTickPadding(2 - width)

		const line = d3.line()
			.defined((d: number) => d)
			.x((d: number, i: number) => x(this.calcDate(i, this.minX)))
			.y((d: number) => y(d))

		const cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.map((d: any) => +d[name])
				})
			})

		const citiesFiltered = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.filter((_, i) => i % 10 == 0).map((d: any) => +d[name])
				})
			})

		this.tree = new segmentTree.SegmentTree(cities, data.length, this.buildSegmentTreeTuple)

		x.domain([this.minX, this.maxX])
		const minMax = this.tree.getMinMax(0, this.tree.size - 1)
		y.domain([minMax.min, minMax.max])

		const view = svg.append('g')
			.selectAll('.view')
			.data(citiesFiltered)
			.enter().append('g')
			.attr('class', 'view')

		view.append('path')
			.attr('d', (d: any) => line(d.values))
			.attr('stroke', (d: any) => color(d.name))

		const gX = svg.append('g')
			.attr('class', 'axis')
			.call(xAxis.axis.bind(xAxis))

		const gY = svg.append('g')
			.attr('class', 'axis')
			.call(yAxis.axis.bind(yAxis))

		svg.append('rect')
			.attr('class', 'zoom')
			.attr('width', width)
			.attr('height', height)
			.call(d3.zoom()
				.scaleExtent([1, 40])
				.translateExtent([[0, 0], [width, height]])
				.on('zoom', this.zoomHandler.bind(this)))

		this.chart = {
			x: x, y: y, rx: x.copy(), ry: y.copy(),
			xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY,
			view: view, data: cities, height: height, line: line, color: color
		}
	}

	private getZoomIntervalY(xSubInterval: [Date, Date], intervalSize: number): [number, number] {
		let from = intervalSize
		let to = 0
		for (let i = 0; i < intervalSize; i++) {
			if (this.calcDate(i, this.minX) >= xSubInterval[0] && this.calcDate(i, this.minX) <= xSubInterval[1]) {
				if (i > to) to = i
				if (i < from) from = i
			}
		}
		return [from, to]
	}

	private calcDate(index: number, offset: Date) {
		return new Date(index * this.stepX + offset.getTime())
	}
}