const svg: any = document.getElementById('svg-container')

function f(x) {
	return Math.sin(x / 100) / 4.0 + 0.5 + Math.sin(x / 10) / 15.0
}

function run(stepsCount: number = 100, delta: number = 0, scale: number = 0.2, fnRender: (delta: number, scale: number) => void) {
	let time = null
	let start = null
	function render(timestamp) {
		if (!start) start = timestamp
		if (time) console.log(timestamp - time)
		time = timestamp

		fnRender(delta, scale)

		delta = (timestamp - start) / 20 * (2 / 5)
		scale = 1 + 0.8 * Math.sin(delta / 50)
		if (--stepsCount > 0) window.requestAnimationFrame(render)
	}
	window.requestAnimationFrame(render)
}