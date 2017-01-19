export enum Orientation {
	Top,
	Right,
	Bottom,
	Left
}

const slice = Array.prototype.slice

const identity = (x: any) => x

function center(scale: any) {
	const width = scale.bandwidth() / 2
	return (d: any) => scale(d) + width
}

function translateX(scale0: any, scale1: any, d: any) {
	const x = scale0(d)
	return 'translate(' + (isFinite(x) ? x : scale1(d)) + ',0)'
}

function translateY(scale0: any, scale1: any, d: any) {
	const y = scale0(d)
	return 'translate(0,' + (isFinite(y) ? y : scale1(d)) + ')'
}

export class MyAxis {
	tickArguments: any[]
	tickValues: any
	tickFormat: any
	tickSizeInner: number
	tickSizeOuter: number
	tickPadding: number
	orient: Orientation
	scale: any

	constructor(orient: Orientation, scale: any) {
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
			transform: any = this.orient === Orientation.Top || this.orient === Orientation.Bottom ? translateX : translateY,
			position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),
			tick = context.selectAll('.tick').data(values, this.scale).order(),
			tickExit = tick.exit(),
			tickEnter = tick.enter().append('g').attr('class', 'tick'),
			line = tick.select('line'),
			text = tick.select('text'),
			k = this.orient === Orientation.Top || this.orient === Orientation.Left ? -1 : 1,
			x = '', y = this.orient === Orientation.Left || this.orient === Orientation.Right ? (x = 'x', 'y') : (x = 'y', 'x')

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
			.attr(y, 3)
			.attr('dy', this.orient === Orientation.Top ? '0em' : this.orient === Orientation.Bottom ? '.21em' : '.62em')
			.text(format)

		context
			.attr('text-anchor', this.orient === Orientation.Right ? 'start' : this.orient === Orientation.Left ? 'end' : 'middle')
			.each(function () { this.__axis = position })
	}

	axisUp(context: any) {
		let values = this.tickValues == null ? (this.scale.ticks ? this.scale.ticks.apply(this.scale, this.tickArguments) : this.scale.domain()) : this.tickValues,
			format = this.tickFormat == null ? (this.scale.tickFormat ? this.scale.tickFormat.apply(this.scale, this.tickArguments) : identity) : this.tickFormat,
			spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
			transform = this.orient === Orientation.Top || this.orient === Orientation.Bottom ? translateX : translateY,
			position = (this.scale.bandwidth ? center : identity)(this.scale.copy()),
			tick = context.selectAll('.tick').data(values, this.scale).order(),
			tickExit = tick.exit(),
			tickEnter = tick.enter().append('g').attr('class', 'tick'),
			k = this.orient === Orientation.Top || this.orient === Orientation.Left ? -1 : 1,
			x = '', y = this.orient === Orientation.Left || this.orient === Orientation.Right ? (x = 'x', 'y') : (x = 'y', 'x')

		tickEnter.append('line')
			.attr(x + '2', k * this.tickSizeInner)
			.attr(y + '1', 0.5)
			.attr(y + '2', 0.5)

		tickEnter.append('text')
			.attr(x, k * spacing)
			.attr(y, 0.5)
			.attr('dy', this.orient === Orientation.Top ? '0em' : this.orient === Orientation.Bottom ? '.21em' : '.62em')
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