declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import draw = require('./draw')

d3
	.csv('ny-vs-sf.csv')
	.row((d: any) => [
		parseFloat(d.NY.split(';')[0]),
		parseFloat(d.SF.split(';')[0])
	])
	.get((error: any, data: any[]) => {
		if (error != null)
		{
			alert('Data can\'t be downloaded or parsed')
			return
		}

		const cities = [0, 1]
			.map((name: number) => data.map((d: any) => +d[name]))

		const onPath = (path: any) => {
			const line = d3.line()
				.defined((d: number) => d)
				.x((d: number, i: number) => i)
				.y((d: number) => d)

			 path.attr('d', (d: any) => line(d))
		}

		d3.selectAll('svg').select(function () {
			new draw.TimeSeriesChart(d3.select(this), new Date(), 86400000, cities, onPath, data.length)
		})
	})

measureFPS.measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})

measureFPS.measureOnce(60, (fps: any) => { alert(`FPS = ${fps}`) })
