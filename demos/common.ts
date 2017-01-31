declare const require: Function
import { ValueFn, select, selectAll, event } from 'd3-selection'

import { TimeSeriesChart } from '../draw'
import { IMinMax } from '../segmentTree'


function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
	const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0]
	const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0]
	const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1]
	const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

export function drawCharts (data: number[][]) {
	let charts: TimeSeriesChart[] = []
	let newZoom: any = null
	let minX = new Date()
	let j = 0

	function onZoom() {
		const z = event.transform.toString()
		if (z == newZoom) return

		newZoom = z
		charts.forEach(c => c.zoom(event.transform))
	}

	const onSelectChart: ValueFn<any, any, any> = function (element: any, datum: any, descElement: any) {
		let chart = new TimeSeriesChart(select(this), minX, 86400000, data.map(_ => _), buildSegmentTreeTuple, onZoom)
		charts.push(chart)
	}

	selectAll('svg').select(onSelectChart)

	setInterval(function() {
		let newData = data[j % data.length]
		charts.forEach(c => c.updateChartWithNewData(newData))
		j++
	}, 1000)
}
