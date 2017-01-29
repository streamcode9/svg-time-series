declare const require: Function
const d3 = require('d3')
import { ValueFn, select, selectAll } from 'd3-selection'
import draw = require('../draw')
import { IMinMax } from '../segmentTree'


function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
	const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0]
	const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0]
	const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1]
	const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

export function drawCharts (data: number[][]) {
	let charts: draw.TimeSeriesChart[] = []
	let newZoom: any = null
	let minX = new Date()
	let j = 0

	function onZoom() {
		const z = d3.event.transform.toString()
		if (z == newZoom) return

		newZoom = z
		charts.forEach(c => c.zoom(d3.event.transform))
	}

	d3.selectAll('svg').select(function() {
		let chart = new draw.TimeSeriesChart(d3.select(this), minX, 86400000, data.map(_ => _), buildSegmentTreeTuple, onZoom)
		charts.push(chart)
	})

	setInterval(function() {
		let newData = data[j % data.length]
		charts.forEach(c => c.updateChartWithNewData(newData))
		j++
	}, 1000)
}
