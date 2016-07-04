declare var require: Function
var d3 = require('../../d3.v4.0.0-rc.2.min')
import drasProc = require('../../draw')
import measureFPS = require('../../measure')
import axis = require('../../axis')

namespace Chart {
	let charts: any = []
	const stepX: number = 90000000
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
			.x((d: number, i: number) => x(calcDate(i)))
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

		const clipWidth = x(calcDate(1))
		svg.append('defs').append('clipPath').attr('id', 'clip').append('rect').attr('width', width - clipWidth).attr('height', height)

		var view = svg.append('g').attr('clip-path', 'url(#clip)')
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

		charts.push({ x: x, y: y, xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY, view: view, data: cities, height: height, line: line, color: color })
	}

	let newZoom: any = null

	let draw = drasProc.draw(function () {
		charts.forEach((chart: any) => {
			chart.view.attr('transform', chart.transform)
			chart.xAxis.setScale(chart.rx).axisUp(chart.gX)
			chart.yAxis.setScale(chart.ry).axisUp(chart.gY)
		})
	})

	function zoomed() {
		let z = d3.event.transform.toString()
		if (z != newZoom) {
			let translateX = d3.event.transform.x
			let scaleX = d3.event.transform.k
			charts = charts.map((chart: any) => {
				chart.rx = d3.event.transform.rescaleX(chart.x)
				let domainX = chart.rx.domain()
				let dataY = chart.data
					.map((d: any) => d.values
						.filter((v: any, i: number) => calcDate(i) >= domainX[0].getTime() && calcDate(i) <= domainX[1].getTime())
						.map((v: number) => v))
				let domainY = d3.extent(d3.merge(dataY))
				let newRangeY = [chart.y(domainY[0]), chart.y(domainY[1])]
				let oldRangeY = chart.y.range()
				let scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1])
				let translateY = scaleY * (oldRangeY[1] - newRangeY[1])
				chart.transform = `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`
				chart.ry = d3.scaleLinear().range([chart.height, 0]).domain(domainY)
				return chart
			})
			newZoom = z
			draw()
		}
	}
	
	function updateChartWithNewData(acc: number, cnt: number) {
		if (acc > cnt) return

		charts.forEach((chart: any) => {
			minX = new Date(minX.getTime() + stepX)
			maxX = calcDate(chart.data[0].values.length)
			chart.data[0].values.push(chart.data[0].values[0])
			chart.data[1].values.push(chart.data[1].values[0])

			chart.x.domain([minX, maxX])
			chart.view.selectAll('path')
				.attr('d', (d: any) => chart.line(d.values))
				.attr('stroke', (d: any) => chart.color(d.name))
				.attr('class', (d: any) => d.name)
				.attr('transform', null)
			var t = d3.transition().duration(100).ease(d3.easeLinear)
			chart.view.selectAll('path').transition(t).attr('transform', 'translate(-' + chart.x(minX) + ', 0)')
		})
		
		d3.timeout(() => {
			charts.forEach((chart: any) => {
				chart.data[0].values.shift()
				chart.data[1].values.shift()
			})
			updateChartWithNewData(acc+1, cnt)
		}, 200)
	}

	d3
		.csv('ny-vs-sf.csv')
		.row((d: any) => ({
			NY: parseFloat(d.NY.split(';')[0]),
			SF: parseFloat(d.SF.split(';')[0])
		}))
		.get((error: any, data: any) => {
			minX = new Date()
			maxX = calcDate(data.length - 1)
			if (error != null) alert('Data can\'t be downloaded or parsed')
			else {
				[0, 1, 2, 3, 4].forEach((i: any) => drawChart(i, data))
				updateChartWithNewData(1, 1000)
			}
		})

	function calcDate(index: number) {
		return new Date(index*stepX + minX.getTime())
	}

	measureFPS.measure(3, function (fps: any) {
		document.getElementById('fps').textContent = fps
	})
}