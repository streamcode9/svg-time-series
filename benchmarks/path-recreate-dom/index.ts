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
			pathsData[0][i - 1].values[1] = y0
		}

		if (!previousPointIsValid[1] && currentPointIsValid[1]) {
			pathsData[1][i - 1].values[1] = y1
		}

		pathsData[0].push({ type: currentPointIsValid[0] ? 'L' : 'M', values: [i, currentPointIsValid[0] ? y0 : 0]})
		pathsData[1].push({ type: currentPointIsValid[1] ? 'L' : 'M', values: [i, currentPointIsValid[1] ? y1 : 0]})

		previousPointIsValid = currentPointIsValid
	})

	if (!previousPointIsValid[0]) {
		pathsData[0][dataLength - 1].values[1] = pathsData[0][0].values[1]
	}

	if (!previousPointIsValid[1]) {
		pathsData[1][dataLength - 1].values[1] = pathsData[1][0].values[1]
	}

	const drawLine = (pathElement: any, cityIdx: number) => {
		// Push new point
		let newData: any = Object.assign({}, pathsData[cityIdx][0])
		newData.values = newData.values.map((_: any) => _)
		pathsData[cityIdx].push(newData)

		// Remove first point
		pathsData[cityIdx].shift()

		// Set temporary start point
		const needToAddStartPoint = pathsData[cityIdx][0].type == 'L'
		if (needToAddStartPoint) {
			let firstPoint: any = Object.assign({}, pathsData[cityIdx][0])
			firstPoint.type = 'M'
			firstPoint.values = firstPoint.values.map((_: any) => _)
			pathsData[cityIdx].unshift(firstPoint)
		}

		// Recalculate indexes
		pathsData[cityIdx] = pathsData[cityIdx].map((d: any, i: number) => {
			d.values[0] = i
			return d
		})

		// Draw
		pathElement.setPathData(pathsData[cityIdx])

		// Remove temporary start point
		if (needToAddStartPoint) pathsData[cityIdx].shift()
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
