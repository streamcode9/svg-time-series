import { select, selectAll } from 'd3-selection'
import { interval as runInterval } from 'd3-timer'
import { csv } from 'd3-request'
import { measure, measureOnce } from '../../measure'
import { TimeSeriesChart } from './draw'
import { IMinMax } from '../../segmentTree'

function buildSegmentTreeTuple(index: number, elements: any): IMinMax {
	const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
	const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
	const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
	const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

function drawCharts(data: any[]) {
	const charts: TimeSeriesChart[] = []
	let j = 0

	selectAll('svg').each(function () {
		const chart = new TimeSeriesChart(select(this), new Date(), 86400000, data, buildSegmentTreeTuple)
		charts.push(chart)
	})

	runInterval(function() {
		let newData = data[j % data.length]
		charts.forEach(c => c.updateChartWithNewData([newData == undefined ? undefined : newData.NY, newData == undefined ? undefined : newData.SF]))
		j++
	})
}

csv('ny-vs-sf.csv')
	.row((d: any) => ({
		NY: parseFloat(d.NY.split(';')[0]),
		SF: parseFloat(d.SF.split(';')[0])
	}))
	.get((error: any, data: any[]) => {
		if (error != null) alert('Data can\'t be downloaded or parsed')
		else drawCharts(data)
	})

measure(3, (fps: any) => {
	document.getElementById('fps').textContent = fps
})

measureOnce(60, (fps: number) => {
	alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
})
