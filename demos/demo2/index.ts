declare const require: Function
const d3 = require('../../node_modules/d3/build/d3.min')
import measureFPS = require('../../measure')
import common = require('../common')

d3
	.csv('ny-vs-sf.csv')
	.row((d: any) => ({
		NY: parseFloat(d.NY.split(';')[0]),
		SF: parseFloat(d.SF.split(';')[0])
	}))
	.get((error: any, data: any) => {
		if (error != null) alert('Data can\'t be downloaded or parsed')
		else {
			common.drawCharts(data, 5)

			window.onresize = function() {
				d3.selectAll('svg').remove()
				d3.selectAll('.chart').append('svg')
				common.drawCharts(data, 5)
			}
		}
	})

measureFPS.measure(3, function (fps: any) {
	document.getElementById('fps').textContent = fps
})