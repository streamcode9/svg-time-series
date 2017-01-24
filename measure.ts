declare const require: Function
const d3timer = require('d3-timer')

export function measure(sec: any, drawFPS: any) {
	let ctr = 0

	d3timer.timer(function () {
		ctr++
	})

	d3timer.interval(function () {
		drawFPS((ctr / sec).toPrecision(3))
		ctr = 0
	}, 1000 * sec)
}

export function measureOnce(sec: any, drawFPS: any) {
	let ctr = 0

	d3timer.timer(function () {
		ctr++
	})

	d3timer.timeout(function () {
		drawFPS((ctr / sec).toPrecision(3))
		ctr = 0
	}, 1000 * sec)
}