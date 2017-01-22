declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import draw = require('./draw')

let avgFps: number = -1

function getRandom(min: number, max: number) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawCharts(data: any[]) {
	const charts: draw.TimeSeriesChart[] = []

	d3.selectAll('svg').select(function () {
		const chart = new draw.TimeSeriesChart(d3.select(this), new Date(), 86400000, data)
		charts.push(chart)
	})

	let timer = d3.interval((elapsed: number) => {
		if (elapsed > 60 * 1000) timer.stop()
		let scaleX =  Math.ceil((document.body.clientWidth + 550) / document.body.clientWidth)
		charts.forEach(c => c.zoom(Math.sin(elapsed / 1500) * 50 - 500, 1, scaleX, 1))
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

measureFPS.measureOnce(60, (fps: any) => { alert(`FPS = ${fps}`) })