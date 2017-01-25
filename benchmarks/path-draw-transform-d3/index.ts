declare const require: Function
import d3request = require('d3-request')
import d3shape = require('d3-shape')
import d3selection = require('d3-selection')
import measureFPS = require('../../measure')
import draw = require('./draw')
import { Selection, BaseType } from 'd3-selection'

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

		const path = d3selection.selectAll('g.view')
			.selectAll('path')
			.data([0, 1])
			.enter().append('path')
			.attr('d', (cityIdx: number) =>
				d3shape.line()
					.defined((d: number[]) => !isNaN(d[cityIdx]))
					.x((d: number[], i: number) => i)
					.y((d: number[]) => d[cityIdx])
					.call(null, data)
			)

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


