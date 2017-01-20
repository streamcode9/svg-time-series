/**
 * SegmentTree reindexing (time to rebuild index 1000 times)
 */

declare const require: Function
import segmentTree = require('../../segmentTree')

const serieLength = 1070

function buildSegmentTreeTuple(index: number, elements: any): segmentTree.IMinMax {
	const nyMinValue = isNaN(elements[0].values[index]) ? Infinity : elements[0].values[index]
	const nyMaxValue = isNaN(elements[0].values[index]) ? -Infinity : elements[0].values[index]
	const sfMinValue = isNaN(elements[1].values[index]) ? Infinity : elements[1].values[index]
	const sfMaxValue = isNaN(elements[1].values[index]) ? -Infinity : elements[1].values[index]
	return { min: Math.min(nyMinValue, sfMinValue), max: Math.max(nyMaxValue, sfMaxValue) }
}

function generateData(): any[] {
	const data: any[] = []

	for (let j = 0; j < 2; j++) {
		const serie: any = { values: [] }
		for (let i = 0; i < serieLength; i++) {
			serie.values.push(Math.random())
		}
		data[j] = serie
	}

	return data
}

let data = generateData()
let times: number[] = []

for (let n = 0; n < 100; n++) {
	const t0 = performance.now()
	for (let k = 0; k < 1000; k++) {
		let tree = new segmentTree.SegmentTree(data, serieLength, buildSegmentTreeTuple)
	}
	const t1 = performance.now()
	times.push(t1 - t0)
}

console.log(`${times.reduce((sum, next) => sum + next, 0) / 100} ms`)