declare const require: Function
const d3 = require('d3')
import measureFPS = require('../../measure')
import common = require('./common')
let resize: any = { interval: 60 }

d3
	.csv('ny-vs-sf.csv')
	.row((d: any) => ({
		NY: parseFloat(d.NY.split(';')[0]),
		SF: parseFloat(d.SF.split(';')[0])
	}))
	.get((error: any, data: any[]) => {
		if (error != null) alert('Data can\'t be downloaded or parsed')
		else {
			common.drawCharts(data)

			resize.request = () => {
				resize.timer && clearTimeout(resize.timer)
				resize.timer = setTimeout(resize.eval, resize.interval)
			}
			resize.eval = () => {
				d3.selectAll('svg').remove()
				d3.select('.charts').selectAll('div').append('svg')
				common.drawCharts(data)
			}
			window.addEventListener('resize', resize.request, false)
		}
	})

measureFPS.measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})