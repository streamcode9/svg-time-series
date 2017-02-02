import { scaleLinear, scaleTime } from 'd3-scale'
import { BaseType, Selection, selectAll } from 'd3-selection'
import { line } from 'd3-shape'
import { timeout as runTimeout } from 'd3-timer'
import { zoom as d3zoom, ZoomTransform } from 'd3-zoom'

import axis = require('./axis')
import { IMinMax, SegmentTree } from './segmentTree'
import { ViewWindowTransform } from './ViewWindowTransform'
import { MyAxis, Orientation } from './axis'
import { animateBench, animateCosDown } from './benchmarks/bench'

interface IChartParameters {
	view: any
	data: number[][]
	line: Function
	update: (minX: number, maxX: number) => void
}

function drawProc(f: Function) {
	let requested = false

	return (...params: any[]) => {
		if (!requested) {
			requested = true
			runTimeout((elapsed: number) => {
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

	// updated when chart runs in background
	private missedStepsCount: number

	// updated when a new point is added
	private tree: SegmentTree

	// Updated when a new point is added
	// used to convert indices to dates shown by X axis
	// Date.now() style timestamp
	private timeAtIdx0: number

	private timeAtIdxLast: number

	// Step by X axis
	// Date.now() style timestamp
	private timeStep: number

	private buildSegmentTreeTuple: (index: number, elements: any) => IMinMax
	private zoomHandler: () => void

	constructor(svg: Selection<BaseType, {}, HTMLElement, any>, startTime: number, timeStep: number, data: number[][], buildSegmentTreeTuple: (index: number, elements: any) => IMinMax, zoomHandler: () => void) {
		this.timeStep = timeStep
		this.timeAtIdx0 = startTime
		this.timeAtIdxLast = this.getTimeByIndex(data.length - 1, startTime)
		this.buildSegmentTreeTuple = buildSegmentTreeTuple
		this.zoomHandler = zoomHandler

		this.drawChart(svg, data)

		this.missedStepsCount = 0
	}

	public zoom = drawProc(function(param: ZoomTransform[]) {
		const zoomTransform: ZoomTransform = param[0]
		const translateX = zoomTransform.x
		const scaleX = zoomTransform.k
/*
		this.chart.rx = zoomTransform.rescaleX(this.chart.x)
		const domainX = this.chart.rx.domain()
		const ySubInterval = this.getZoomIntervalY(domainX, this.chart.data.length)
		const minMax = this.tree.getMinMax(ySubInterval[0], ySubInterval[1])
		const domainY = [minMax.min, minMax.max]
		const newRangeY = [this.chart.y(domainY[0]), this.chart.y(domainY[1])]
		const oldRangeY = this.chart.y.range()
		const scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1])
		const translateY = scaleY * (oldRangeY[1] - newRangeY[1])
		const ry = scaleLinear().range([this.chart.height, 0]).domain(domainY)

		this.chart.view.attr('transform', `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`)
		this.chart.xAxis.setScale(this.chart.rx).axisUp(this.chart.gX)
		this.chart.yAxis.setScale(ry).axisUp(this.chart.gY)
*/
		}.bind(this))

	private drawChart(svg: Selection<BaseType, {}, HTMLElement, any>, data: number[][]) {
		const node: SVGSVGElement = svg.node() as SVGSVGElement
		const div: HTMLElement = node.parentNode as HTMLElement

		const width = div.clientWidth
		const height = div.clientHeight

		svg.attr('width', width)
		svg.attr('height', height)

		const drawLine = (cityIdx: number) => line()
			.defined((d: [number, number]) => {
				return !(isNaN(d[cityIdx]) || d[cityIdx] == null)
			})
			.x((d: [number, number], i: number) => i)
			.y((d: [number, number]) => d[cityIdx])

		this.tree = new SegmentTree(data, data.length, this.buildSegmentTreeTuple)

		const view = svg.select('g.view')
		const path = view
			.selectAll('path')
			.data([0, 1])
			.enter().append('path')
			.attr('d', (cityIndex: number) => drawLine(cityIndex).call(null, data))

		const x = scaleTime().range([0, width])
		const y = scaleLinear().range([height, 0])

		const xAxis = new MyAxis(Orientation.Bottom, x)
			.ticks(4)
			.setTickSize(height)
			.setTickPadding(8 - height)
			.setScale(x)

		const yAxis = new MyAxis(Orientation.Right, y)
			.ticks(4)
			.setTickSize(width)
			.setTickPadding(2 - width)
			.setScale(y)

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
			.call(d3zoom()
				.scaleExtent([1, 40])
				.translateExtent([[0, 0], [width, height]])
				.on('zoom', this.zoomHandler.bind(this)))

		const viewNode: SVGGElement = view.node() as SVGGElement
		const pathTransform = new ViewWindowTransform(viewNode.transform.baseVal)

		// minIdxX and maxIdxX are indexes (model X coordinates) at chart edges
		// so they are updated by zoom and pan or animation
		// but unaffected by arrival of new data
		const update = (minIdxX: number, maxIdxX: number) => {
			const idxToTime = (idx: number) => this.getTimeByIndex(idx, this.timeAtIdx0)
			const { min, max } = this.tree.getMinMax(minIdxX, maxIdxX)
			pathTransform.setViewWindow(minIdxX, maxIdxX, min, max)
			x.domain([minIdxX, maxIdxX].map(idxToTime))
			y.domain([min, max])

			xAxis.axisUp(gX)
			yAxis.axisUp(gY)
		}

		pathTransform.setViewPort(width, height)

		const updateChartWithNewData = (newData: number[]) => {
			this.missedStepsCount++

			this.chart.data.push(newData)
			this.chart.data.shift()
			this.tree = new SegmentTree(this.chart.data, this.chart.data.length, this.buildSegmentTreeTuple)

			this.timeAtIdx0 += this.timeStep
			this.timeAtIdxLast += this.timeStep
			update(0, this.chart.data.length - 1)

			this.drawNewData()
		}

		let j = 0
		setInterval(function() {
			let newData = data[j % data.length]
			updateChartWithNewData(newData)
			j++
		}, 1000)

		this.chart = {
			view, data, line: drawLine,
			update
		}
	}

/*	private getZoomIntervalY(xSubInterval: [Date, Date], intervalSize: number) : [number, number] {
		let from = intervalSize
		let to = 0
		for (let i = 0; i < intervalSize; i++) {
			if (this.getTimeByIndex(i, this.timeAtIdx0) >= xSubInterval[0] && this.getTimeByIndex(i, this.timeAtIdx0) <= xSubInterval[1]) {
				if (i > to) {
					to = i
				}
				if (i < from) {
					from = i
				}
			}
		}
		return [from, to]
	}*/

	private drawNewData = drawProc(function() {
		const stepsToDraw = this.missedStepsCount
		this.missedStepsCount = 0
//		this.minX = this.calcDate(stepsToDraw, this.minX)
// Note that minX and maxX are not this.minX!
// this.chart.update(minX, maxX)
		this.chart.view.selectAll('path').attr('d', (cityIndex: number) => this.chart.line(cityIndex).call(null, this.chart.data))
	}.bind(this))

	private getTimeByIndex(index: number, startTime: number): number {
		return index * this.timeStep + startTime
	}
}
