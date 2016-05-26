declare var Plotly: any

function generateData() {
	let lines = []
	for (let i = 0; i < 10; i++) {
		var xs = [], ys = []
		for (let x = 0; x < 5000; x++) {
			xs.push(x * 0.2)
			ys.push(f(x) * 100 + i * 50)
		}
		lines.push({ y: ys, x: xs })
	}
	return lines
}

var container = document.getElementById('plotly-container');
Plotly.plot(container, generateData())