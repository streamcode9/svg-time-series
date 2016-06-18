declare var require: Function
var d3 = require('./d3.v4.0.0-alpha.44.min')

namespace Chart {
	let top = 1,
		right = 2,
		bottom = 3,
		left = 4

	let slice = Array.prototype.slice

	let identity = (x: any) => x

	function center(scale: any) {
		let width = scale.bandwidth() / 2
		return (d: any) => scale(d) + width
	}

	function translateX(scale0: any, scale1: any, d: any) {
		var x = scale0(d)
		return 'translate(' + (isFinite(x) ? x : scale1(d)) + ',0)'
	}

	function translateY(scale0: any, scale1: any, d: any) {
		var y = scale0(d)
		return 'translate(0,' + (isFinite(y) ? y : scale1(d)) + ')'
	}

	class MyAxis {
		tickArguments: any[]
		tickValues: any
		tickFormat: any
		tickSizeInner: number
		tickSizeOuter: number
		tickPadding: number
		orient: number
		scale: any

		constructor(orient: any, scale: any) {
			this.orient = orient
			this.scale = scale
			this.tickArguments = []
			this.tickValues = null
			this.tickFormat = null
			this.tickSizeInner = 6
			this.tickSizeOuter = 6
			this.tickPadding = 3
		}

		axis(context: any) {
			let values: any = this.tickValues == null ? (this.scale.ticks ? this.scale.ticks.apply(this.scale, this.tickArguments) : this.scale.domain()) : this.tickValues,
				format: any = this.tickFormat == null ? (this.scale.tickFormat ? this.scale.tickFormat.apply(this.scale, this.tickArguments) : identity) : this.tickFormat,
				spacing: any = Math.max(this.tickSizeInner, 0) + this.tickPadding,
				transform: any = this.orient === top || this.orient === bottom ? translateX : translateY,
				position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),
				tick = context.selectAll('.tick').data(values, this.scale).order(),
				tickExit = tick.exit(),
				tickEnter = tick.enter().append('g').attr('class', 'tick'),
				line = tick.select('line'),
				text = tick.select('text'),
				k = this.orient === top || this.orient === left ? -1 : 1,
				x = '', y = this.orient === left || this.orient === right ? (x = 'x', 'y') : (x = 'y', 'x')

			tick = tick.merge(tickEnter)
			line = line.merge(tickEnter.append('line').attr(x + '2', k * this.tickSizeInner))
			text = text.merge(tickEnter.append('text').attr(x, k * spacing))

			tickExit.remove()

			tick.attr('transform', (d: any) => transform(position, position, d))

			line
				.attr(x + '2', k * this.tickSizeInner)
				.attr(y + '1', 0.5)
				.attr(y + '2', 0.5)

			text
				.attr(x, k * spacing)
				.attr(y, 0.5)
				.attr('dy', this.orient === top ? '0em' : this.orient === bottom ? '.71em' : '.32em')
				.text(format)

			context
				.attr('text-anchor', this.orient === right ? 'start' : this.orient === left ? 'end' : 'middle')
				.each(function () { this.__axis = position })
		}

		axisUp(context: any) {
			let values = this.tickValues == null ? (this.scale.ticks ? this.scale.ticks.apply(this.scale, this.tickArguments) : this.scale.domain()) : this.tickValues,
				format = this.tickFormat == null ? (this.scale.tickFormat ? this.scale.tickFormat.apply(this.scale, this.tickArguments) : identity) : this.tickFormat,
				spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
				transform = this.orient === top || this.orient === bottom ? translateX : translateY,
				position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),
				tick = context.selectAll('.tick').data(values, this.scale).order(),
				tickExit = tick.exit(),
				tickEnter = tick.enter().append('g').attr('class', 'tick'),
				k = this.orient === top || this.orient === left ? -1 : 1,
				x = '', y = this.orient === left || this.orient === right ? (x = 'x', 'y') : (x = 'y', 'x')

			tickEnter.append('line')
				.attr(x + '2', k * this.tickSizeInner)
				.attr(y + '1', 0.5)
				.attr(y + '2', 0.5)

			tickEnter.append('text')
				.attr(x, k * spacing)
				.attr(y, 0.5)
				.attr('dy', this.orient === top ? '0em' : this.orient === bottom ? '.71em' : '.32em')
				.text(format)

			tickExit.remove()
			tick.attr('transform', (d: any) => transform(position, position, d))
		}

		setScale(_: any) { return this.scale = _, this }

		ticks(...args: any[]) {
			return this.tickArguments = slice.call(args), this
		}

		setTickArguments(_: any) {
			return this.tickArguments = _ == null ? [] : slice.call(_), this
		}

		setTickValues(_: any) {
			return this.tickValues = _ == null ? null : slice.call(_), this
		}

		setTickFormat(_: any) {
			return this.tickFormat = _, this
		}

		setTickSize(_: number): MyAxis {
			return this.tickSizeInner = this.tickSizeOuter = +_, this
		}

		setTickSizeInner(_: number) {
			return this.tickSizeInner = +_, this
		}

		setTickSizeOuter(_: number) {
			return this.tickSizeOuter = +_, this
		}

		setTickPadding(_: number) {
			return this.tickPadding = +_, this
		}
	}

	let axes: any = []

	function drawChart(id: number, data: any) {
		let svg = d3.select('#chart-' + id),
			width = +svg.attr('width'),
			height = +svg.attr('height')

		let x = d3.scaleTime().range([0, width])
		let y = d3.scaleLinear().range([height, 0])
		let color = d3.scaleOrdinal().domain(['NY', 'SF']).range(['green', 'blue'])

		var xAxis = new MyAxis(bottom, x)
			.ticks((width + 2) / (height + 2) * 10)
			.setTickSize(height)
			.setTickPadding(8 - height)

		var yAxis = new MyAxis(right, y)
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

	let draw = drawProc(function () {
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

	function drawProc(f: any) {
		let requested = false

		return function () {
			if (!requested) {
				requested = true
				d3.timeout(function (time: any) {
					requested = false
					f(time)
				})
			}
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

	function measureFPS(sec: any, drawFPS: any) {
		var ctr = 0

		d3.timer(function () {
			ctr++
		})

		d3.interval(function () {
			drawFPS((ctr / sec).toPrecision(3))
			ctr = 0
		}, 1000 * sec)

	}

	measureFPS(3, function (fps: any) {
		document.getElementById('fps').textContent = fps
	})
}