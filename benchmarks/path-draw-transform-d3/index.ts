declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import draw = require('./draw')

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