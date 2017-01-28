declare const require: Function
const d3timer = require('d3-timer')

export function measure(sec: any, drawFPS: any) {
	let ctr = 0

	d3timer.timer(() => ctr++)

	d3timer.interval(() => {
		drawFPS((ctr / sec).toPrecision(3))
		ctr = 0
	}, 1000 * sec)
}

export function measureOnce(sec: any, drawFPS: any) {
	let ctr = 0

	d3timer.timer(() => ctr++)

	d3timer.timeout(() => {
		drawFPS((ctr / sec).toPrecision(3))
		ctr = 0
	}, 1000 * sec)
}
