const svg: any = document.getElementById('svg-container')

function f(x) {
	return Math.sin(x / 100) / 4.0 + 0.5 + Math.sin(x / 10) / 15.0
}

function animate(id, yOffset) {
	let x = 0, y = 0, delta = 0, scale = 0.2

	const path: any = document.getElementById(id)
	let pathData = [{ type: "M", values: [0, 100] }]
	for (x = 0; x < 5000; x++) pathData.push({ type: 'L', values: [x, f(x)] })
	path.setPathData(pathData);

	const transformations = path.transform.baseVal
	const translateTransform = svg.createSVGTransform()
	translateTransform.setTranslate(-delta, yOffset)
	transformations.appendItem(translateTransform)
	const scaleTransform = svg.createSVGTransform()
	scaleTransform.setScale(scale, 100)
	transformations.appendItem(scaleTransform)

	let time = null
	let start = null
	let stepsCount = 100
	function render(timestamp) {
		if (!start) start = timestamp
		if (time) console.log(timestamp - time)
		time = timestamp

		const translateTransform = svg.createSVGTransform()
		translateTransform.setTranslate(-delta, yOffset)
		transformations.replaceItem(translateTransform, 0)
		const scaleTransform = svg.createSVGTransform()
		scaleTransform.setScale(scale, 100)
		transformations.replaceItem(scaleTransform, 1)

		delta = (timestamp - start) / 20 * (2 / 5)
		scale = 1 + 0.8 * Math.sin(delta / 50)
		if (--stepsCount > 0) window.requestAnimationFrame(render)
	}
	window.requestAnimationFrame(render)
}

for (let i = 0; i < 9; i++) animate('g' + i, 50 + i * 50)