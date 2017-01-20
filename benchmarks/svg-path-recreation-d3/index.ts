declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import draw = require('../../draw')
import segmentTree = require('../../segmentTree')

function getRandom(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildSegmentTreeTuple(index: number, elements: any): segmentTree.IMinMax {
	const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
	const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
	const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
	const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

function drawCharts(data: any[]) {
	const charts: draw.TimeSeriesChart[] = []
	let newZoom: any = null
	let j = 0

	function onZoom() {
		const z = d3.event.transform.toString()
		if (z == newZoom) return
	
		newZoom = z
		charts.forEach(c => c.zoom(d3.event.transform))
	}

	d3.selectAll('svg').select(function () {
		const chart = new draw.TimeSeriesChart(d3.select(this), new Date(), 86400000, data, buildSegmentTreeTuple, onZoom)
		charts.push(chart)
	})

	d3.interval(function() {
		let newData = data[j % data.length]
		charts.forEach(c => c.updateChartWithNewData([newData == undefined ? undefined : newData.NY, newData == undefined ? undefined : newData.SF]))
		j++
	})
}

d3
	.csv('ny-vs-sf.csv')
	.row((d: any) => ({
		NY: parseFloat(d.NY.split(';')[0]),
		SF: parseFloat(d.SF.split(';')[0])
	}))
	.get((error: any, data: any[]) => {
		if (error != null) alert('Data can\'t be downloaded or parsed')
		else drawCharts(data)
	})

measureFPS.measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})