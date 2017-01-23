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
		if (error != null)
		{
			alert('Data can\'t be downloaded or parsed')
			return
		}

		const color = d3.scaleOrdinal()
			.domain(['NY', 'SF'])
			.range(['green', 'blue'])

		const cities = color.domain()
			.map((name: string) => {
				return ({
					name: name,
					color: color(name),
					values: data.map((d: any) => +d[name])
				})
			})

		const line = d3.line()
			.defined((d: number) => d)
			.x((d: number, i: number) => i)
			.y((d: number) => d)

		d3.selectAll('svg').select(function () {
			new draw.TimeSeriesChart(d3.select(this), new Date(), 86400000, cities, line)
		})
	})

measureFPS.measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})

measureFPS.measureOnce(60, (fps: any) => { alert(`FPS = ${fps}`) })
