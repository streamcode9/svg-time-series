declare var require: Function
var d3 = require('./d3.v4.min')

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