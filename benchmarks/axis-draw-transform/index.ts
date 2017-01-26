declare const require: Function
import d3request = require('d3-request')
import d3selection = require('d3-selection')
import measureFPS = require('../../measure')
import draw = require('./draw')

d3request
	.csv('ny-vs-sf.csv')
	.row((d: any) => [
		parseFloat(d.NY.split(';')[0]),
		parseFloat(d.SF.split(';')[0])
	])
	.get((error: null, data: [number, number]) => {
		if (error != null)
		{
			alert('Data can\'t be downloaded or parsed')
			return
		}

		d3selection.selectAll('svg').each(function () {
			new draw.TimeSeriesChart(d3selection.select(this), data.length)
			return this
		})

		measureFPS.measure(3, (fps: any) => {
			document.getElementById('fps').textContent = fps
		})

		measureFPS.measureOnce(60, (fps: number) => {
			alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
		})
	})