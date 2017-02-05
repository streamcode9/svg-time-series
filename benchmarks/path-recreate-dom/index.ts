import { select, selectAll } from 'd3-selection'
import { measureAll, onCsv } from '../bench'
import { TimeSeriesChart } from './draw'

onCsv((data) => {
	const dataLength = data.length

	let pathsData: any[][] = [[],[]]
	let previousPointIsValid = [true, true]
	data.forEach((d: number[], i: number, arr: number[][]) => {
		const y0 = arr[i][0]
		const y1 = arr[i][1]
		const currentPointIsValid = [!isNaN(y0), !isNaN(y1)]

		if (!previousPointIsValid[0] && currentPointIsValid[0]) {
			pathsData[0].push({ type: 'M', values: [i, y0]})
		}

		if (!previousPointIsValid[1] && currentPointIsValid[1]) {
			pathsData[1].push({ type: 'M', values: [i, y1]})
		}

		pathsData[0].push({ type: i == 0 || !currentPointIsValid[0] ? 'M' : 'L', values: [i, currentPointIsValid[0] ? y0 : 0], isValid: currentPointIsValid[0]})
		pathsData[1].push({ type: i == 0 || !currentPointIsValid[1] ? 'M' : 'L', values: [i, currentPointIsValid[1] ? y1 : 0], isValid: currentPointIsValid[1]})

		previousPointIsValid = currentPointIsValid
	})

	const drawLine = (pathElement: any, cityIdx: number) => {
		// Push new point
		let newData: any = Object.assign({}, pathsData[cityIdx][0])
		newData.type = newData.isValid ? 'L' : 'M'
		pathsData[cityIdx].push(newData)

		// Remove first point
		pathsData[cityIdx].shift()

		// Set path start point
		let firstPoint: any = Object.assign({}, pathsData[cityIdx][0])
		pathsData[cityIdx].unshift(firstPoint)
		pathsData[cityIdx][0].type = 'M'

		// Recalculate indexes
		pathsData[cityIdx] = pathsData[cityIdx].map((d: any, i: number) => {
			d.values[0] = i
			return d
		})

		// Draw
		pathElement.setPathData(pathsData[cityIdx])

		// Remove temporary start point
		pathsData[cityIdx].shift()
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
