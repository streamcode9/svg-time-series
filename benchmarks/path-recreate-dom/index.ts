import { select, selectAll } from 'd3-selection'
import { measureAll, onCsv } from '../bench'
import { TimeSeriesChart } from './draw'

onCsv((data) => {
	const dataLength = data.length

	const drawLine = (pathElement: any, cityIdx: number, off: number) => {
		const idx = (i: number) => (i + off) % dataLength

		let pathData: any = []
		let previousPointIsValid = true
		data.forEach((d: number[], i: number, arr: number[][]) => {
			const y = arr[idx(i)][cityIdx]
			const currentPointIsValid = !isNaN(y)

			if (!previousPointIsValid && currentPointIsValid) {
				pathData.push({ type: 'M', values: [i, y]})
			}

			pathData.push({ type: i == 0 || !currentPointIsValid ? 'M' : 'L', values: [i, currentPointIsValid ? y : 0]})

			previousPointIsValid = currentPointIsValid
		})

		pathElement.setPathData(pathData)
	}

	const path = selectAll('g.view')
		.selectAll('path')
		.data([0, 1])
		.enter().append('path')

	selectAll('svg').each(function() {
		return new TimeSeriesChart(select(this), dataLength, drawLine)
	})

	measureAll()
})
