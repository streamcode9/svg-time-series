declare const require: Function
const d3 = require('./d3.v4.min')

export function draw(f: any) {
	let requested = false

	return function () {
		if (!requested) {
			requested = true
			d3.timeout(function (time: any) {
				requested = false
				f(time)
			})
		}
	}
}