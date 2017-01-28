import { selectAll } from 'd3-selection'
import { line as d3_line } from 'd3-shape'

import { f, run } from '../common'

const delta = 0
const scale = 0.2
const data = []
for (let x = 0; x < 5000; x++) {
	data.push(f(x))
}
const line = d3_line<number>()
	.x((y: number, i: number) => i)
	.y((y: number) => y)

selectAll('path')
	.datum(data)
	.attr('d', line)

run(100, delta, scale, (delt, scal) => {
	selectAll('path')
		.attr('transform', (d: any, i: number) => {
			const tx = -delt
			const ty = i * 50
			return `translate(${tx}, ${ty}) scale(${scal}, 100)`
		})
})
