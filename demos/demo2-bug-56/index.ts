import { ValueFn, select, selectAll, event } from 'd3-selection'
import { csv } from 'd3-request'

import { TimeSeriesChart } from './draw'
import { IMinMax } from '../../segmentTree'

function onCsv(f: (csv: [number, number][]) => void) : void {
	csv('ny-vs-sf.csv')
	.row((d: {NY: string, SF: string}) => [
		parseFloat(d.NY.split(';')[0]),
		parseFloat(d.SF.split(';')[0]),
	])
	.get((error: null, data: [number, number][]) => {
		if (error != null) {
			alert('Data can\'t be downloaded or parsed')
			return
		}
		f(data)
	})
}

onCsv((data: [number, number][]) => {
	drawCharts(data)
})

function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
	const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0]
	const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0]
	const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1]
	const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

export function drawCharts (data: [number, number][]) {
	let charts: TimeSeriesChart[] = []
	let newZoom = ''

	function onZoom() {
		const z = event.transform.toString()
		if (z == newZoom) return
	
		newZoom = z
		charts.forEach(c => c.zoom())
	}

	const onSelectChart: ValueFn<any, any, any> = function (element: any, datum: any, descElement: any) {
		let chart = new TimeSeriesChart(select(this), Date.now(), 86400000, data.map(_ => _), buildSegmentTreeTuple, onZoom)
		charts.push(chart)
	}

	selectAll('svg').select(onSelectChart)
}