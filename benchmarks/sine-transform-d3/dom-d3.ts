import { selectAll } from 'd3-selection'
import { line as d3_line } from 'd3-shape'

import { f, run } from '../common'

const delta = 0
const scale = 0.2
const data = []
for (let x = 0; x < 5000; x++) {
	data.push({x, y: f(x) })
}
const line: any = d3_line()
	.x((d: any) => d.x)
	.y((d: any) => d.y)

selectAll('path')
	.datum(data)
	.attr('d', line)
	.attr('transform', (d: any, i: number) => {
		const tx = -delta
		const ty = i * 50
		return `translate(${tx}, ${ty}) scale(${scale}, 100)`
	})

run(100, delta, scale, (delt, scal) => {
	selectAll('path')
		.attr('transform', (d: any, i: number) => {
			const tx = -delt
			const ty = i * 50
			return `translate(${tx}, ${ty}) scale(${scal}, 100)`
		})
})
