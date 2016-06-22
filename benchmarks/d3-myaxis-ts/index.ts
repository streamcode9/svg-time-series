declare var require: Function
var d3 = require('../../d3.v4.0.0-alpha.50.min')
import drasProc = require('../../draw')
import measureFPS = require('../../measure')
import axis = require('../../axis')

namespace Chart {
	let axes: any = []

	function drawChart(id: number, data: any) {
		let svg = d3.select('#chart-' + id),
			width = +svg.attr('width'),
			height = +svg.attr('height')

		let x = d3.scaleTime().range([0, width])
		let y = d3.scaleLinear().range([height, 0])
		let color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		var xAxis = new axis.MyAxis(axis.Orientation.Bottom, x)
			.ticks((width + 2) / (height + 2) * 10)
			.setTickSize(height)
			.setTickPadding(8 - height)

		var yAxis = new axis.MyAxis(axis.Orientation.Right, y)
			.ticks(10)
			.setTickSize(width)
			.setTickPadding(8 - width)

		let line = d3.line()
			.x((d: any) => x(d.date))
			.y((d: any) => y(d.value))

		var cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					values: data.filter((d: any) => !isNaN(d[name])).map((d: any) => ({ date: d.date, value: +d[name] }))
				})
			})

		x.domain(d3.extent(data, (d: any) => d.date))
		y.domain([
			d3.min(cities, (c: any) => d3.min(c.values, (v: any) => v.value)),
			d3.max(cities, (c: any) => d3.max(c.values, (v: any) => v.value))
		])

		var view = svg.selectAll('.view')
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

		axes.push({ x: x, y: y, xAxis: xAxis, yAxis: yAxis, gX: gX, gY: gY, view: view })
	}

	let newZoom: any = null	

	let draw = drasProc.draw(function () {
		axes.forEach((axis: any) => {
			axis.view.attr('transform', newZoom)
			axis.xAxis.setScale(axis.rx).axisUp(axis.gX)
			axis.yAxis.setScale(axis.ry).axisUp(axis.gY)
		})
	})

	function zoomed() {
		let z = d3.event.transform.toString()
		if (z != newZoom) {
			axes = axes.map((axis: any) => {
				axis.rx = d3.event.transform.rescaleX(axis.x)
				axis.ry = d3.event.transform.rescaleY(axis.y)
				return axis
			})
			newZoom = z
			draw()
		}
	}

	d3
		.csv('ny-vs-sf.csv')
		.row((d: any) => ({
			date: new Date(d.Date),
			NY: parseFloat(d.NY.split(';')[0]),
			SF: parseFloat(d.SF.split(';')[0])
		}))
		.get((error: any, data: any) => {
			if (error != null) alert('Data can\'t be downloaded or parsed')
			else[0, 1, 2, 3, 4].forEach(i => drawChart(i, data))
		})

	measureFPS.measure(3, function (fps: any) {
		document.getElementById('fps').textContent = fps
	})
}