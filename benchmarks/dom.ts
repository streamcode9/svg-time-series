function f(x) {
	return Math.sin(x / 100) / 4.0 + 0.5 + Math.sin(x / 10) / 15.0
}

function animate(id, yOffset) {
	var path: any = document.getElementById(id)
	var descriptions = path.getAttribute('d')
	var x = 0, y = 0
	var delta = 0
	var scale = 0.2
	for (x = 0; x < 5000; x++) {
		y = f(x)
		descriptions += ` L ${x} ${y}`
	}
	path.setAttribute('d', descriptions)

	setInterval(function () {
		var t = new Date().getTime() 
		path.setAttribute('transform', 'translate(' + (- delta) + ', ' + yOffset + ') scale(' + scale + ', 100)')
		delta += 2 / 5
		scale = 1 + 0.8 * Math.sin(delta / 50)		
		console.log(new Date().getTime() - t)
	}, 1000 / 50)
}

animate('g0', 50)
animate('g1', 100)
animate('g2', 150)
animate('g3', 200)
animate('g4', 250)
animate('g5', 300)
animate('g6', 350)
animate('g7', 400)
animate('g8', 450)
animate('g9', 500)