import { select, selectAll } from 'd3-selection'
import { measure, measureOnce } from '../../measure'
import { TimeSeriesChart } from './draw'

selectAll('svg').each(function () {
	new TimeSeriesChart(select(this), 1070)
	return this
})

measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})

measureOnce(60, (fps: number) => {
	alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
})
