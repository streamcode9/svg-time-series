declare const require: Function
const d3 = require('../d3.v4.min')
import drawProc = require('../draw')
import axis = require('../axis')
import segmentTree = require('../segmentTree')

export class TimeSeriesChart {
	private charts: any = []
	private minX: Date
	private maxX: Date
	private missedStepsCount: number
	private stepX: number = 86400000
	private tree: segmentTree.SegmentTree
	private newZoom: any = null
	private newZoomTransform: any = null

	constructor(minX: Date, data: any, chartsAmount: number) {
		this.minX = minX
		this.maxX = this.calcDate(data.length - 1, minX)

		for (let i = 0; i < chartsAmount; i++) this.drawChart(i, data)

		this.missedStepsCount = 0
		setInterval(this.updateChartWithNewData.bind(this), 1000)
	}

	private buildTupleFunction(index: number, elements: any): [number, number] {
		const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
		const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
		const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
		const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
		return [Math.min(nyMinValue, sfMinValue), Math.max(nyMaxValue, sfMaxValue)]
	}

	private drawChart(id: number, data: any) {
		const svg = d3.select('#chart-' + id),
			width = parseInt(svg.style('width')),
			height = parseInt(svg.style('height'))

		const x = d3.scaleTime().range([0, width])
		const y = d3.scaleLinear().range([height, 0])
		const color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		const xAxis = new axis.MyAxis(axis.Orientation.Bottom, x)
			.ticks((width + 2) / (height + 2) * 2)
			.setTickSize(height)
			.setTickPadding(8 - height)

		const yAxis = new axis.MyAxis(axis.Orientation.Right, y)
			.ticks(10)
			.setTickSize(width)
			.setTickPadding(8 - width)

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

		this.tree = new segmentTree.SegmentTree(cities, cities[0].values.length, this.buildTupleFunction)

		x.domain([this.minX, this.maxX])
		y.domain(this.tree.getMinMax(0, this.tree.size - 1))

		const view = svg.append('g')
			.selectAll('.view')
			.data(cities)
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
				.on('zoom', this.zoomed.bind(this)))

		this.charts.push({
			x: x, y: y, rx: x.copy(), ry: y.copy(),
			xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY,
			view: view, data: cities, height: height, line: line, color: color
		})
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

	private draw = drawProc.draw(function() {
		d3.zoom().transform(d3.selectAll('.zoom'), this.newZoomTransform)
		const translateX = this.newZoomTransform.x
		const scaleX = this.newZoomTransform.k

		this.charts.forEach((chart: any) => {
			chart.rx = this.newZoomTransform.rescaleX(chart.x)
			const domainX = chart.rx.domain()
			const ySubInterval = this.getZoomIntervalY(domainX, chart.data[0].values.length)
			const domainY = this.tree.getMinMax(ySubInterval[0], ySubInterval[1])
			const newRangeY = [chart.y(domainY[0]), chart.y(domainY[1])]
			const oldRangeY = chart.y.range()
			const scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1])
			const translateY = scaleY * (oldRangeY[1] - newRangeY[1])
			const ry = d3.scaleLinear().range([chart.height, 0]).domain(domainY)

			chart.view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
			chart.yAxis.setScale(ry).axisUp(chart.gY)
		})
	}.bind(this))

	private drawNewData = drawProc.draw(function () {
		const stepsToDraw = this.missedStepsCount
		this.missedStepsCount = 0

		this.minX = this.calcDate(stepsToDraw, this.minX)
		this.maxX = this.calcDate(this.charts[0].data[0].values.length - 1, this.minX)

		const minimumRX = this.calcDate(stepsToDraw, this.charts[0].rx.domain()[0])
		const maximumRX = this.calcDate(stepsToDraw, this.charts[0].rx.domain()[1])

		this.charts.forEach((chart: any) => {
			chart.x.domain([this.minX, this.maxX])
			chart.view.selectAll('path').attr('d', (d: any) => chart.line(d.values))

			chart.rx.domain([minimumRX, maximumRX])
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
		})
	}.bind(this))

	private zoomed() {
		const z = d3.event.transform.toString()
		if (z == this.newZoom) return

		this.newZoom = z
		this.newZoomTransform = d3.event.transform
		this.draw()
	}

	private updateChartWithNewData() {
		this.missedStepsCount++

		this.charts.forEach((chart: any) => {
			chart.data[0].values.push(chart.data[0].values[0])
			chart.data[1].values.push(chart.data[1].values[0])

			chart.data[0].values.shift()
			chart.data[1].values.shift()
		})

		this.tree = new segmentTree.SegmentTree(this.charts[0].data, this.charts[0].data[0].values.length, this.buildTupleFunction)

		this.drawNewData()
	}

	private calcDate(index: number, offset: Date) {
		return new Date(index * this.stepX + offset.getTime())
	}
}
