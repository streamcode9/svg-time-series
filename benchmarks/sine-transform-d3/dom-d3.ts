import common = require('../common')
declare var require: Function
var d3 = require('d3')

let delta = 0, scale = 0.2
let data = []
for (let x = 0; x < 5000; x++) data.push({ x: x, y: common.f(x) })
var line = d3.svg.line()
    .x((d: any) => d.x)
    .y((d: any) => d.y)

d3.selectAll('path')
	.datum(data)
    .attr('d', line)
	.attr('transform', (d: any, i: number) => {
		let tx = -delta
		let ty = i * 50
		return `translate(${tx}, ${ty}) scale(${scale}, 100)`
	})

common.run(100, delta, scale, (delt, scal) => {
	d3.selectAll('path')
		.attr('transform', (d: any, i: number) => {
			let tx = -delt
			let ty = i * 50
			return `translate(${tx}, ${ty}) scale(${scal}, 100)`
		})
})