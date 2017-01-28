import { measure, measureOnce } from '../measure'
import { csv } from 'd3-request'

export function measureAll() : void {
	measure(3, (fps) => {
		document.getElementById('fps').textContent = fps
	})

	measureOnce(60, (fps) => {
		alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`)
	})
}

export function onCsv(f: (csv: number[][]) => void) : void {
	csv('ny-vs-sf.csv')
	.row((d: {NY: string, SF: string}) => [
		parseFloat(d.NY.split(';')[0]),
		parseFloat(d.SF.split(';')[0]),
	])
	.get((error: null, data: number[][]) => {
		if (error != null) {
			alert('Data can\'t be downloaded or parsed')
			return
		}
		f(data)
	})
}
