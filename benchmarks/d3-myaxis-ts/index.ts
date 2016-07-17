declare var require: Function
var d3 = require('../../d3.v4.min')
import drawProc = require('../../draw')
import measureFPS = require('../../measure')
import axis = require('../../axis')

namespace Chart {
	let charts: any = []
	const stepX: number = 86400000
	let minX: Date
	let maxX: Date

	function drawChart(id: number, data: any) {
		let svg = d3.select('#chart-' + id),
			width = +svg.attr('width'),
			height = +svg.attr('height')

		let x = d3.scaleTime().range([0, width])
		let y = d3.scaleLinear().range([height, 0])
		let color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		var xAxis = new axis.MyAxis(axis.Orientation.Bottom, x)
			.ticks((width + 2) / (height + 2) * 2)
			.setTickSize(height)
			.setTickPadding(8 - height)

		var yAxis = new axis.MyAxis(axis.Orientation.Right, y)
			.ticks(10)
			.setTickSize(width)
			.setTickPadding(8 - width)

		let line = d3.line()
			.x((d: number, i: number) => x(calcDate(i, minX)))
			.y((d: number) => y(d))

		let cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.filter((d: any) => !isNaN(d[name])).map((d: any) => +d[name])
				})
			})

		x.domain([minX, maxX])
		y.domain(d3.extent(d3.merge(cities.map((v: any) => v.values))))

		var view = svg.append('g')
			.selectAll('.view')
			.data(cities)
			.enter().append('g')
			.attr('class', 'view')

		view.append('path')
			.attr('d', (d: any) => line(d.values))
			.attr('stroke', (d: any) => color(d.name))

		var gX = svg.append('g')
			.attr('class', 'axis')
			.call(xAxis.axis.bind(xAxis))

		var gY = svg.append('g')
			.attr('class', 'axis')
			.call(yAxis.axis.bind(yAxis))

		svg.append('rect')
			.attr('class', 'zoom')
			.attr('width', width)
			.attr('height', height)
			.call(d3.zoom()
				.scaleExtent([1, 40])
				.translateExtent([[-100, -100], [width + 90, height + 100]])
				.on('zoom', zoomed))

		charts.push({ x: x, y: y, rx: x.copy(), ry: y.copy(),
			xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY, 
			view: view, data: cities, height: height, line: line, color: color })
	}

	let newZoom: any = null
	let newZoomTransform: any = null

	let draw = drawProc.draw(function () {
		let translateX = newZoomTransform.x
		let scaleX = newZoomTransform.k

		charts.forEach((chart: any) => {
			chart.rx = newZoomTransform.rescaleX(chart.x)
			const domainX = chart.rx.domain()
			const dataY = chart.data
				.map((d: any) => d.values
					.filter((v: any, i: number) => calcDate(i, minX) >= domainX[0].getTime() && calcDate(i, minX) <= domainX[1].getTime())
					.map((v: number) => v))
			const domainY = d3.extent(d3.merge(dataY))
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

	function zoomed() {
		const z = d3.event.transform.toString()
		if (z == newZoom) return

		newZoom = z
		newZoomTransform = d3.event.transform
		draw()
	}

	function updateChartWithNewData() {
		minX = calcDate(1, minX)
		maxX = calcDate(charts[0].data[0].values.length - 1, minX)

		const minimumRX = new Date(charts[0].rx.domain()[0].getTime() + stepX)
		const maximumRX = new Date(charts[0].rx.domain()[1].getTime() + stepX)

		charts.forEach((chart: any) => {
			chart.data[0].values.push(chart.data[0].values[0])
			chart.data[1].values.push(chart.data[1].values[0])

			chart.x.domain([minX, maxX])
			chart.view.selectAll('path').attr('d', (d: any) => chart.line(d.values))

			chart.rx.domain([minimumRX, maximumRX])
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
		})
		
		d3.timeout(() => {
			charts.forEach((chart: any) => {
				chart.data[0].values.shift()
				chart.data[1].values.shift()
			})
			updateChartWithNewData()
		}, 300)
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
				updateChartWithNewData()
			}
		})

	function calcDate(index: number, offset: Date) {
		return new Date(index*stepX + offset.getTime())
	}

	measureFPS.measure(3, function (fps: any) {
		document.getElementById('fps').textContent = fps
	})
}