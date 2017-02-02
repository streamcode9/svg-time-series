import { scaleLinear, scaleTime } from 'd3-scale'
import { BaseType, event as d3event, Selection, selectAll } from 'd3-selection'
import { line } from 'd3-shape'
import { timeout as runTimeout } from 'd3-timer'
import { zoom as d3zoom, ZoomTransform } from 'd3-zoom'

import axis = require('./axis')
import { IMinMax, SegmentTree } from './segmentTree'
import { ViewWindowTransform } from './ViewWindowTransform'
import { MyAxis, Orientation } from './axis'
import { animateBench, animateCosDown } from './benchmarks/bench'
import { betweenBasesAR1, updateNode } from './viewZoomTransform'

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

class MyTransform {

	viewPortPointsX: [number, number]
	viewPortPointsY: [number, number]

	referenceViewWindowPointsX: [number, number]
	referenceViewWindowPointsY: [number, number]

	identityTransform: SVGMatrix	
	referenceTransform: SVGMatrix
	zoomTransform: SVGMatrix
	svgNode: SVGSVGElement

	
	viewNode: SVGGElement

	constructor(svgNode: SVGSVGElement, viewNode: SVGGElement) {
		this.identityTransform = svgNode.createSVGMatrix()
		this.viewNode = viewNode
		this.svgNode = svgNode
		this.zoomTransform = this.identityTransform
		this.referenceTransform = this.identityTransform
		this.viewPortPointsX = [0, 1]
		this.viewPortPointsY = [0, 1]
		this.referenceViewWindowPointsX = [0, 1]
		this.referenceViewWindowPointsY = [0, 1]
	}

	private updateReferenceTransform()  {
		const affX = betweenBasesAR1(this.referenceViewWindowPointsX, this.viewPortPointsX)
		const affY = betweenBasesAR1(this.referenceViewWindowPointsY, this.viewPortPointsY)
		this.referenceTransform = affY.applyToMatrixY(affX.applyToMatrixX(this.identityTransform))
	}

	public onViewPortResize(newWidth: number, newHeight: number) : void {
		this.viewPortPointsX = [0, newWidth]
		this.viewPortPointsY = [newHeight, 0]
		this.updateReferenceTransform()
	}

	public onReferenceViewWindowResize(newPointsX: [number, number], newPointsY: [number, number]) {
		this.referenceViewWindowPointsX = newPointsX
		this.referenceViewWindowPointsY = newPointsY
		this.updateReferenceTransform()
	}

	public updateViewNode() {
		updateNode(this.viewNode, this.zoomTransform.multiply(this.referenceTransform))
	}

	public onZoomPan(t: ZoomTransform) : void {
		this.zoomTransform = this.identityTransform.translate(t.x, 0).scaleNonUniform(t.k, 1)
	}

	public fromScreenToModelX(x: number) {
		const fwd = this.zoomTransform.multiply(this.referenceTransform)
		const bwd = fwd.inverse()
		
		const p = this.svgNode.createSVGPoint()
		p.x = x
		p.y = 0 // irrelevant
		return p.matrixTransform(bwd).x
	}
}

export class TimeSeriesChart {
	private chart: IChartParameters
	private minX: Date
	private maxX: Date

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
	}

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
		const viewNode: SVGGElement = view.node() as SVGGElement
		const pathTransform = new MyTransform(svg.node() as SVGSVGElement, viewNode)


		
		// minIdxX and maxIdxX are indexes (model X coordinates) at chart edges
		// so they are updated by zoom and pan or animation
		// but unaffected by arrival of new data
		const updateScales = (minIdxX: number, maxIdxX: number) => {
			const idxToTime = (idx: number) => this.getTimeByIndex(idx, this.timeAtIdx0)
			const { min, max } = this.tree.getMinMax(minIdxX, maxIdxX)
			pathTransform.onReferenceViewWindowResize([0, data.length - 1], [min, max])
			x.domain([minIdxX, maxIdxX].map(idxToTime))
			y.domain([min, max])

		}

		updateScales(0, data.length - 1)


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


		// it's important that we have only 1 instance
		// of drawProc and not one per event
		const scheduleRefresh = drawProc(() => {
			const minX = pathTransform.fromScreenToModelX(0)
			const maxX = pathTransform.fromScreenToModelX(width)
			updateScales(minX, maxX)	
			pathTransform.updateViewNode()

			xAxis.axisUp(gX)
			yAxis.axisUp(gY)
		})

		const newZoom = () => {
			pathTransform.onZoomPan(d3event.transform)
			scheduleRefresh()
		}

//	
		pathTransform.onViewPortResize(width, height)
		pathTransform.onReferenceViewWindowResize([0, data.length - 1], [0, 1])
		pathTransform.updateViewNode()
	scheduleRefresh()
		svg.append('rect')
			.attr('class', 'zoom')
			.attr('width', width)
			.attr('height', height)
			.call(d3zoom()
				.scaleExtent([1, 40])
				.translateExtent([[0, 0], [width, height]])
				.on('zoom', newZoom))

		this.chart = {
			view, data, line: drawLine,
			update: scheduleRefresh
		}
	}

	public updateChartWithNewData (newData: number[]) {
		this.chart.data.push(newData)
		this.chart.data.shift()

		this.timeAtIdx0 += this.timeStep
		this.timeAtIdxLast += this.timeStep

		this.drawNewData()
	}

	private drawNewData = drawProc(function() {
		this.tree = new SegmentTree(this.chart.data, this.chart.data.length, this.buildSegmentTreeTuple)
		this.chart.update()
		this.chart.view.selectAll('path').attr('d', (cityIndex: number) => this.chart.line(cityIndex).call(null, this.chart.data))
	}.bind(this))

	private getTimeByIndex(index: number, startTime: number): number {
		return index * this.timeStep + startTime
	}
}
