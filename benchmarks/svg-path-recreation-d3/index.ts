import { select, selectAll } from 'd3-selection'
import { interval as runInterval } from 'd3-timer'
import { line } from 'd3-shape'
import { measureAll, onCsv } from '../bench'
import { TimeSeriesChart } from './draw'

onCsv((data) => {
	const drawLine = (cityIdx: number) => {
		return line()
			.defined((d) => !isNaN(d[cityIdx]))
			.x((d, i) => i)
			.y((d) => d[cityIdx])
	}

	const path = selectAll('g.view')
		.selectAll('path')
		.data([0, 1])
		.enter().append('path')
		.attr('d', (cityIdx) => drawLine(cityIdx).call(null, data))

	selectAll('svg').each(function() {
		return new TimeSeriesChart(select(this), data, drawLine)
	})

	measureAll()
})