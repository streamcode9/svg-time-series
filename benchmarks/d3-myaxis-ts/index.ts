declare var d3: any

namespace Chart {
	let top = 1,
		right = 2,
		bottom = 3,
		left = 4,
		epsilon = 1e-6

	let slice = Array.prototype.slice

	let identity = (x: any) => x

	function center(scale: any) {
		let width = scale.bandwidth() / 2
		return (d: any) => scale(d) + width
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
				range: any = this.scale.range(),
				range0 = range[0] + 0.5,
				range1 = range[range.length - 1] + 0.5,
				position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),
				selection = context.selection ? context.selection() : context,
				path = selection.selectAll('.domain').data([null]),
				tick = selection.selectAll('.tick').data(values, this.scale).order(),
				tickExit = tick.exit(),
				tickEnter = tick.enter().append('g', '.domain').attr('class', 'tick'),
				line = tick.select('line'),
				text = tick.select('text'),
				k = this.orient === top || this.orient === left ? -1 : 1,
				x = '', y = this.orient === left || this.orient === right ? (x = 'x', 'y') : (x = 'y', 'x')

			path = path.merge(path.enter().append('path')
				.attr('class', 'domain')
				.attr('stroke', '#000'))

			tick = tick.merge(tickEnter)

			line = line.merge(tickEnter.append('line')
				.attr('stroke', '#000')
				.attr(x + '2', k * this.tickSizeInner))

			text = text.merge(tickEnter.append('text')
				.attr('fill', '#000')
				.attr(x, k * spacing))

			if (context !== selection) {
				path = path.transition(context)
				tick = tick.transition(context)
				line = line.transition(context)
				text = text.transition(context)

				tickExit = tickExit.transition(context)
					.attr('opacity', epsilon)
					.attr('transform', function (d: any) { return transform(position, this.parentNode.__axis || position, d) })

				tickEnter
					.attr('opacity', epsilon)
					.attr('transform', function (d: any) { return transform(this.parentNode.__axis || position, position, d) })
			}

			tickExit.remove()

			path
				.attr('d', this.orient === left || this.orient == right
					? 'M' + k * this.tickSizeOuter + ',' + range0 + 'H0.5V' + range1 + 'H' + k * this.tickSizeOuter
					: 'M' + range0 + ',' + k * this.tickSizeOuter + 'V0.5H' + range1 + 'V' + k * this.tickSizeOuter)

			tick
				.attr('opacity', 1)
				.attr('transform', (d: any) => transform(position, position, d))

			line
				.attr(x + '2', k * this.tickSizeInner)
				.attr(y + '1', 0.5)
				.attr(y + '2', 0.5)

			text
				.attr(x, k * spacing)
				.attr(y, 0.5)
				.attr('dy', this.orient === top ? '0em' : this.orient === bottom ? '.71em' : '.32em')
				.text(format)

			selection
				.attr('fill', 'none')
				.attr('font-size', 10)
				.attr('font-family', 'sans-serif')
				.attr('text-anchor', this.orient === right ? 'start' : this.orient === left ? 'end' : 'middle')
				.each(function () { this.__axis = position })
		}

		axisUp(context: any) {
			let values = this.tickValues == null ? (this.scale.ticks ? this.scale.ticks.apply(this.scale, this.tickArguments) : this.scale.domain()) : this.tickValues,
				format = this.tickFormat == null ? (this.scale.tickFormat ? this.scale.tickFormat.apply(this.scale, this.tickArguments) : identity) : this.tickFormat,
				spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
				transform = this.orient === top || this.orient === bottom ? translateX : translateY,
				range = this.scale.range(),
				range0 = range[0] + 0.5,
				range1 = range[range.length - 1] + 0.5,
				position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),

				selection = context.selection ? context.selection() : context,
				path = selection.selectAll('.domain').data([null]),
				tick = selection.selectAll('.tick').data(values, this.scale).order(),

				tickExit = tick.exit(),
				tickEnter = tick.enter().append('g', '.domain').attr('class', 'tick'),
				k = this.orient === top || this.orient === left ? -1 : 1,
				x = '', y = this.orient === left || this.orient === right ? (x = 'x', 'y') : (x = 'y', 'x')

			path = path.merge(path.enter().append('path')
				.attr('class', 'domain')
				.attr('stroke', '#000')
				.attr('d', this.orient === left || this.orient == right
					? 'M' + k * this.tickSizeOuter + ',' + range0 + 'H0.5V' + range1 + 'H' + k * this.tickSizeOuter
					: 'M' + range0 + ',' + k * this.tickSizeOuter + 'V0.5H' + range1 + 'V' + k * this.tickSizeOuter)
			)

			tickEnter.append('line')
				.attr('stroke', '#000')
				.attr(x + '2', k * this.tickSizeInner)
				.attr(y + '1', 0.5)
				.attr(y + '2', 0.5)
				.attr('opacity', 1)

			tickEnter.append('text')
				.attr('fill', '#000')
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

	function translateX(scale0: any, scale1: any, d: any) {
		var x = scale0(d)
		return 'translate(' + (isFinite(x) ? x : scale1(d)) + ',0)'
	}

	function translateY(scale0: any, scale1: any, d: any) {
		var y = scale0(d)
		return 'translate(0,' + (isFinite(y) ? y : scale1(d)) + ')'
	}

	var svg = d3.select('svg'),
		width = +svg.attr('width'),
		height = +svg.attr('height')

	var x = d3.scaleLinear()
		.domain([-1, width + 1])
		.range([-1, width + 1])

	var y = d3.scaleLinear()
		.domain([-1, height + 1])
		.range([-1, height + 1])

	var xAxis = new MyAxis(bottom, x)
		.ticks((width + 2) / (height + 2) * 10)
		.setTickSize(height)
		.setTickPadding(8 - height)

	var yAxis = new MyAxis(right, y)
		.ticks(10)
		.setTickSize(width)
		.setTickPadding(8 - width)

	let lineX = d3.scaleTime().range([0, width])
	let lineY = d3.scaleLinear().range([height, 0])

	let line = d3.line()
		.x((d: any) => lineX(d.date))
		.y((d: any) => lineY(d.value))

	d3.csv('ny-vs-sf.csv',
		(d: any) => ({ date: new Date(d.Date), value: parseFloat(d.NY.split(';')[0]) }),
		(data: any) => {
			lineX.domain(d3.extent(data, (d: any) => d.date))
			lineY.domain(d3.extent(data, (d: any) => d.value))

			var view = svg.append('path')
				.datum(data)
				.attr('class', 'view')
				.attr('d', line)

			var gX = svg.append('g')
				.attr('class', 'axis axis--x')
				.call(xAxis.axis.bind(xAxis))

			var gY = svg.append('g')
				.attr('class', 'axis axis--y')
				.call(yAxis.axis.bind(yAxis))

			svg.append('rect')
				.attr('class', 'zoom')
				.attr('width', width)
				.attr('height', height)
				.call(d3.zoom()
					.scaleExtent([1, 40])
					.translateExtent([[-100, -100], [width + 90, height + 100]])
					.on('zoom', zoomed))

			let newZoom: any = null
			let rx: any = null
			let ry: any = null

			let draw = drawProc(function () {
				view.attr('transform', newZoom)
				xAxis.setScale(rx).axisUp(gX)
				yAxis.setScale(ry).axisUp(gY)
			})

			function zoomed() {
				let z = d3.event.transform.toString()
				if (z != newZoom) {
					rx = d3.event.transform.rescaleX(x)
					ry = d3.event.transform.rescaleY(y)
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