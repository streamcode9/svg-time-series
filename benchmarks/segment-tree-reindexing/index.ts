/**
 * SegmentTree reindexing (time to rebuild index 1000 times)
 */

import { IMinMax, SegmentTree } from '../../segmentTree'

interface IElement {
	values: number[]
}

const serieLength = 1070

function buildSegmentTreeTuple(index: number, elements: IElement[]) : IMinMax {
	const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
	const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
	const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
	const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

function generateData() : IElement[] {
	const data = []

	for (let j = 0; j < 2; j++) {
		const values = []
		for (let i = 0; i < serieLength; i++) {
			values.push(Math.random())
		}
		data[j] = { values }
	}
	return data
}

const data = generateData()
const times = []

for (let n = 0; n < 100; n++) {
	const t0 = performance.now()
	for (let k = 0; k < 1000; k++) {
		const tree = new SegmentTree(data, serieLength, buildSegmentTreeTuple)
	}
	const t1 = performance.now()
	times.push(t1 - t0)
}

const avgTimeMs = times.reduce((sum, next) => sum + next, 0) / 100
console.log(`${avgTimeMs} ms`)
