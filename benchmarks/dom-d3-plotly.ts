declare var Plotly: any

function generateData() {
	let lines = []
	for (let i = 0; i < 10; i++) {
		var xs = [], ys = []
		for (let x = 0; x < 5000; x++) {
			xs.push(x * 0.2)
			ys.push(f(x) * 100 + 50 * i)
		}
		lines.push({ y: ys, x: xs, line: { width: 1 }, showlegend: false })
	}
	return lines
}

var container = document.getElementById('plotly-container');

let start = Date.now()
const layout = {
	autosize: false, width: 1270, height: 750,
	yaxis: { showgrid: false, showticklabels: false },
	xaxis: { showgrid: false, showticklabels: false }
}
function render() {
	Plotly.plot(container, generateData(), layout, { staticPlot: true })
	window.requestAnimationFrame(() => console.log(Date.now() - start))
}
window.requestAnimationFrame(render)