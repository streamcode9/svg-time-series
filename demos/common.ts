declare const require: Function
const d3 = require('../d3.v4.min')
import draw = require('../draw')

function buildSegmentTreeTuple(index: number, elements: any): [number, number] {
	const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
	const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
	const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
	const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
	return [Math.min(nyMinValue, sfMinValue), Math.max(nyMaxValue, sfMaxValue)]
}

export function drawCharts (data: any, chartsAmount: number) {
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

	for (let i = 1; i < chartsAmount + 1; i++) {
		let svg = d3.select(`.chart:nth-child(${i})`).select('svg')
		let chart = new draw.TimeSeriesChart(svg, minX, data, buildSegmentTreeTuple, onZoom)
		charts.push(chart)
	}

	setInterval(function() {
		let newData = data[j % data.length]
		charts.forEach(c => c.updateChartWithNewData([newData == undefined ? undefined : newData.NY, newData == undefined ? undefined : newData.SF]))
		j++
	}, 1000)
}
