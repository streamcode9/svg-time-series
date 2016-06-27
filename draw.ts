declare var require: Function
var d3 = require('./d3.v4.0.0-rc.2.min')

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