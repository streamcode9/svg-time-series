declare const require: Function
import d3request = require('d3-request')
import d3selection = require('d3-selection')
import measureFPS = require('../../measure')
import draw = require('./draw')

d3selection.selectAll('svg').each(function () {
	new draw.TimeSeriesChart(d3selection.select(this), 1070)
	return this
})

measureFPS.measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})

measureFPS.measureOnce(60, (fps: number) => {
	alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
})
