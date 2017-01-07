declare const require: Function
const d3 = require('../../d3.v4.min')
import drawProc = require('../../draw')
import measureFPS = require('../../measure')
import axis = require('../../axis')
import segmentTree = require('../../segmentTree')

namespace Chart {
	const charts: any = []
	const stepX: number = 86400000
	let minX: Date
	let maxX: Date
	let missedStepsCount: number
	let tree: segmentTree.SegmentTree

	function buildTupleFunction(index: number, elements: any): [number, number] {
		const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
		const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
		const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
		const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
		return [Math.min(nyMinValue, sfMinValue), Math.max(nyMaxValue, sfMaxValue)]
	}

	function drawChart(id: number, data: any) {
		const svg = d3.select('#chart-' + id),
			width = 960,
			height = 170

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
			.x((d: number, i: number) => x(calcDate(i, minX)))
			.y((d: number) => y(d))

		const cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.map((d: any) => +d[name])
				})
			})

		tree = new segmentTree.SegmentTree(cities, cities[0].values.length, buildTupleFunction)

		x.domain([minX, maxX])
		y.domain(tree.getMinMax(0, tree.size - 1))

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
				.on('zoom', zoomed))

		charts.push({
			x: x, y: y, rx: x.copy(), ry: y.copy(),
			xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY,
			view: view, data: cities, height: height, line: line, color: color
		})
	}

	let newZoom: any = null
	let newZoomTransform: any = null

	function getZoomIntervalY(xSubInterval: [Date, Date], intervalSize: number): [number, number] {
		let from = intervalSize
		let to = 0
		for (let i = 0; i < intervalSize; i++) {
			if (calcDate(i, minX) >= xSubInterval[0] && calcDate(i, minX) <= xSubInterval[1]) {
				if (i > to) to = i
				if (i < from) from = i
			}
		}
		return [from, to]
	}

	const draw = drawProc.draw(function () {
		d3.zoom().transform(d3.selectAll('.zoom'), newZoomTransform)
		const translateX = newZoomTransform.x
		const scaleX = newZoomTransform.k

		charts.forEach((chart: any) => {
			chart.rx = newZoomTransform.rescaleX(chart.x)
			const domainX = chart.rx.domain()
			const ySubInterval = getZoomIntervalY(domainX, chart.data[0].values.length)
			const domainY = tree.getMinMax(ySubInterval[0], ySubInterval[1])
			const newRangeY = [chart.y(domainY[0]), chart.y(domainY[1])]
			const oldRangeY = chart.y.range()
			const scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1])
			const translateY = scaleY * (oldRangeY[1] - newRangeY[1])
			const ry = d3.scaleLinear().range([chart.height, 0]).domain(domainY)

			chart.view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
			chart.yAxis.setScale(ry).axisUp(chart.gY)
		})
	})

	const drawNewData = drawProc.draw(function () {
		const stepsToDraw = missedStepsCount
		missedStepsCount = 0

		minX = calcDate(stepsToDraw, minX)
		maxX = calcDate(charts[0].data[0].values.length - 1, minX)

		const minimumRX = calcDate(stepsToDraw, charts[0].rx.domain()[0])
		const maximumRX = calcDate(stepsToDraw, charts[0].rx.domain()[1])

		charts.forEach((chart: any) => {
			chart.x.domain([minX, maxX])
			chart.view.selectAll('path').attr('d', (d: any) => chart.line(d.values))

			chart.rx.domain([minimumRX, maximumRX])
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
		})
	})

	function zoomed() {
		const z = d3.event.transform.toString()
		if (z == newZoom) return

		newZoom = z
		newZoomTransform = d3.event.transform
		draw()
	}

	function updateChartWithNewData() {
		missedStepsCount++

		charts.forEach((chart: any) => {
			chart.data[0].values.push(chart.data[0].values[0])
			chart.data[1].values.push(chart.data[1].values[0])

			chart.data[0].values.shift()
			chart.data[1].values.shift()
		})

		tree = new segmentTree.SegmentTree(charts[0].data, charts[0].data[0].values.length, buildTupleFunction)

		drawNewData()
	}

	d3
		.csv('ny-vs-sf.csv')
		.row((d: any) => ({
			NY: parseFloat(d.NY.split(';')[0]),
			SF: parseFloat(d.SF.split(';')[0])
		}))
		.get((error: any, data: any) => {
			if (error != null) alert('Data can\'t be downloaded or parsed')
			else {
				minX = new Date()
				maxX = calcDate(data.length - 1, minX);

				[0, 1, 2, 3, 4].forEach((i: any) => drawChart(i, data))
				missedStepsCount = 0
				setInterval(updateChartWithNewData, 1000)
			}
		})

	function calcDate(index: number, offset: Date) {
		return new Date(index * stepX + offset.getTime())
	}

	measureFPS.measure(3, function (fps: any) {
		document.getElementById('fps').textContent = fps
	})
}
