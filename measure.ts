declare const require: Function
const d3 = require('./node_modules/d3/build/d3.min')

export function measure(sec: any, drawFPS: any) {
	let ctr = 0

	d3.timer(function () {
		ctr++
	})

	d3.interval(function () {
		drawFPS((ctr / sec).toPrecision(3))
		ctr = 0
	}, 1000 * sec)
}