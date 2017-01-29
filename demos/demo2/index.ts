import d3request = require('d3-request')
import d3selection = require('d3-selection')
import d3shape = require('d3-shape')
import { measure } from '../../measure'
import common = require('../common')

interface Resize {
  interval: number
, request: () => void
, timer: number
, eval: () => void
}

const resize: Resize = { interval: 60, request : null, timer: null, eval: null }

d3request
	.csv('ny-vs-sf.csv')
	.row((d: { NY: string, SF:string }) => ({
		NY: parseFloat(d.NY.split(';')[0]),
		SF: parseFloat(d.SF.split(';')[0])
	}))
	.get((error: null, data: any[]) => {
		if (error != null) alert('Data can\'t be downloaded or parsed')
		else {
			common.drawCharts(data, 5)

			resize.request = function() {
				resize.timer && clearTimeout(resize.timer)
				resize.timer = setTimeout(resize.eval, resize.interval)
			}
			resize.eval = function() {
				d3selection.selectAll('svg').remove()
				d3selection.select('.charts').selectAll('div').append('svg')
				common.drawCharts(data, 5)
			}
			window.addEventListener('resize', resize.request, false)
		}
	})

measure(3, (fps) => {
	document.getElementById('fps').textContent = fps
})
