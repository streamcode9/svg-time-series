import { select, selectAll } from 'd3-selection'
import { line } from 'd3-shape'
import { measureAll, onCsv } from '../bench'
import { TimeSeriesChart } from './draw'

onCsv((data) => {
	const dataLength = data.length

	const drawLine = (cityIdx: number, off: number) => {
		const idx = (i: number) => (i + off) % dataLength

		return line()
			.defined((d, i, arr) => !isNaN(arr[idx(i)][cityIdx]))
			.x((d, i) => i)
			.y((d, i, arr) => arr[idx(i)][cityIdx])
	}

	const path = selectAll('g.view')
		.selectAll('path')
		.data([0, 1])
		.enter().append('path')
		.attr('d', (cityIdx) => drawLine(cityIdx, 0).call(null, data))

	selectAll('svg').each(function() {
		return new TimeSeriesChart(select(this), data, drawLine)
	})

	measureAll()
})
