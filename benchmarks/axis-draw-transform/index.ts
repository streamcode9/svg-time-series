import { select, selectAll } from 'd3-selection'
import { measure, measureOnce } from '../../measure'
import { TimeSeriesChart } from './draw'

function makeChart() {
	return new TimeSeriesChart(select(this), 1070)
}

selectAll('svg').each(makeChart)

measure(3, (fps: number) => {
	document.getElementById('fps').textContent = `${fps}`
})

measureOnce(60, (fps: number) => {
	alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
})
