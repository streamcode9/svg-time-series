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
	scale1: any
	scale2: any

	constructor(orient: Orientation, scale1: any, scale2?: any) {
		this.orient = orient
		this.scale1 = scale1
		this.scale2 = scale2
		this.tickArguments = []
		this.tickValues = null
		this.tickFormat = null
		this.tickSizeInner = 6
		this.tickSizeOuter = 6
		this.tickPadding = 3
	}

	createValues(scale1: any, scale2?: any): Array<Array<any>> {
		const createValuesFromScale = (scale: any): Array<any> => scale.ticks ? scale.ticks.apply(scale, this.tickArguments) : scale.domain()

		const values1 = createValuesFromScale(scale1);
		const values2 = scale2 ? createValuesFromScale(scale2) : [];
		return values1.map((v: any, i: number) => [v, scale2 ? values2[i] : null])
	}

	createFormat(scale: any, columnIdx: number): (tuple: Array<any>) => any {
		const formatValue: (value: any) => any = (scale: any) => scale.tickFormat ? scale.tickFormat.apply(scale, this.tickArguments) : identity
		return (tuple: Array<any>) => (formatValue(scale)(tuple[columnIdx]))
	}

	axis(context: any) {
		const values = this.createValues(this.scale1, this.scale2),
			formats = this.scale2 ? [this.createFormat(this.scale1, 0), this.createFormat(this.scale2, 1)] : [this.createFormat(this.scale1, 0)],
			spacing: any = Math.max(this.tickSizeInner, 0) + this.tickPadding,
			transform: any = this.orient === Orientation.Top || this.orient === Orientation.Bottom ? translateX : translateY,
			position = (this.scale1.bandwidth ? center : identity)(this.scale1.copy())
		let tick = context.selectAll('.tick').data(values, this.scale1).order(),
			tickExit = tick.exit(),
			tickEnter = tick.enter().append('g').attr('class', 'tick'),
			line = tick.select('line'),
			text = tick.select('text'),
			k = this.orient === Orientation.Top || this.orient === Orientation.Left ? -1 : 1
		let x = ''
		const y = this.orient === Orientation.Left || this.orient === Orientation.Right ? (x = 'x', 'y') : (x = 'y', 'x')

		tick = tick.merge(tickEnter)
		line = line.merge(tickEnter.append('line').attr(x + '2', k * this.tickSizeInner))

		const createText = () => text.merge(tickEnter.append('text').attr(x, k * spacing))
		const texts = this.scale2 ? [createText(), createText()] : [createText()]

		tickExit.remove()

		// fix needs there, we must not hard-code index
		tick.attr('transform', (d: any) => transform(position, position, d[0]))

		line
			.attr(x + '2', k * this.tickSizeInner)
			.attr(y + '1', 0.5)
			.attr(y + '2', 0.5)

		texts.map((txt: any, i: number) =>
			txt.attr(x, k * spacing)
			.attr(y, 3)
			.attr('dy', this.orient === Orientation.Top ? '0em' : this.orient === Orientation.Bottom ? '.41em' : '.62em')
			.text(formats[i]))

		context
			.attr('text-anchor', this.orient === Orientation.Right ? 'start' : this.orient === Orientation.Left ? 'end' : 'middle')
			.each(function () { this.__axis = position })
	}

	axisUp(context: any) {
		const values = this.createValues(this.scale1, this.scale2),
			formats = this.scale2 ? [this.createFormat(this.scale1, 0), this.createFormat(this.scale2, 1)] : [this.createFormat(this.scale1, 0)],
			spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
			transform = this.orient === Orientation.Top || this.orient === Orientation.Bottom ? translateX : translateY,
			position = (this.scale1.bandwidth ? center : identity)(this.scale1.copy()),
			k = this.orient === Orientation.Top || this.orient === Orientation.Left ? -1 : 1
		let tick = context.selectAll('.tick').data(values, this.scale1).order(),
			tickExit = tick.exit(),
			tickEnter = tick.enter().append('g').attr('class', 'tick'),
			line = tick.select('line'),
			text = tick.select('text')

		let x = ''
		const y = this.orient === Orientation.Left || this.orient === Orientation.Right ? (x = 'x', 'y') : (x = 'y', 'x')

		tick = tick.merge(tickEnter)
		line = line.merge(tickEnter.append('line').attr(x + '2', k * this.tickSizeInner))

		const createText = () => text.merge(tickEnter.append('text').attr(x, k * spacing))
		const texts = this.scale2 ? [createText(), createText()] : [createText()]

		tickExit.remove()

		// fix is needed there
		tick.attr('transform', (d: any) => transform(position, position, d[0]))

		line
			.attr(x + '2', k * this.tickSizeInner)
			.attr(y + '1', 0.5)
			.attr(y + '2', 0.5)

		texts.map((txt: any, i: number) =>
			txt.attr(x, k * spacing)
				.attr(y, 3)
				.attr('dy', this.orient === Orientation.Top ? '0em' : this.orient === Orientation.Bottom ? '.41em' : '.62em')
				.text(formats[i]))
	}

	setScale(scale1: any, scale2?: any) {
		this.scale1 = scale1
		this.scale2 = scale2
		return this
	}

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
