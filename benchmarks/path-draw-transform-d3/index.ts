declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import draw = require('./draw')
import segmentTree = require('../../segmentTree')

let avgFps: number = -1

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

	d3.selectAll('svg').select(function () {
		const chart = new draw.TimeSeriesChart(d3.select(this), new Date(), 86400000, data, buildSegmentTreeTuple)
		charts.push(chart)
	})

	let timer = d3.interval((elapsed: number) => {
		if (elapsed > 60 * 1000) {
			alert(`FPS = ${avgFps}`)
			timer.stop()
		}
		let t = d3.zoomIdentity.translate(Math.sin(elapsed) * 50, 1).scale(8)
		charts.forEach(c => c.zoom(t))
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
	avgFps = avgFps == -1 ? fps : (avgFps + fps) / 2
})