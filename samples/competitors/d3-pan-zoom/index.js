var svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

var points = d3.range(2000).map(phyllotaxis(10));

var g = svg.append("g");

g.selectAll("circle")
  .data(points)
  .enter()
  .append("circle")
  .attr("cx", function (d) {
    return d[0];
  })
  .attr("cy", function (d) {
    return d[1];
  })
  .attr("r", 2.5);

svg
  .append("rect")
  .attr("width", width)
  .attr("height", height)
  .style("fill", "none")
  .style("pointer-events", "all")
  .call(
    d3
      .zoom()
      .scaleExtent([1 / 2, 4])
      .on("zoom", zoomed),
  );

function phyllotaxis(radius) {
  var theta = Math.PI * (3 - Math.sqrt(5));
  return function (i) {
    var r = radius * Math.sqrt(i),
      a = theta * i;
    return [width / 2 + r * Math.cos(a), height / 2 + r * Math.sin(a)];
  };
}

var newZoom = null;
var zoomCount = 0;
var maxZoomCount = 0;

var draw = drawProc(function () {
  maxZoomCount = Math.max(zoomCount, maxZoomCount);
  document.getElementById("misc").textContent = maxZoomCount;
  zoomCount = 0;
  g.attr("transform", newZoom);
});

function zoomed() {
  zoomCount += 1;
  var z = d3.event.transform.toString();

  if (z != newZoom) {
    newZoom = z;
    draw();
  }
}

function drawProc(f) {
  var requested = false;

  return function () {
    if (!requested) {
      requested = true;
      requestAnimationFrame(function (time) {
        requested = false;
        f(time);
      });
    }
  };
}

function measureFPS(sec, drawFPS) {
  var ctr = 0;

  d3.timer(function () {
    ctr++;
  });

  setInterval(function () {
    drawFPS((ctr / sec).toPrecision(3));
    ctr = 0;
  }, 1000 * sec);
}

measureFPS(3, function (fps) {
  document.getElementById("fps").textContent = fps;
});

/*
var q = [ [0,0,0], [0,0,1] ]

function vector_add(a,b) {
    return a.map(function (ai, i) { return ai + b[i] })
}

function vector_sub(a,b) {
    return a.map(function (ai, i) { return ai - b[i] })
}

var delta = vector_sub(q[1], q[0])

var dxdt = delta[0] / delta[2]
var dydt = delta[1] / delta[2]

var dt = time - q[1][2]

var acc = 1

var x = q[1][0] + dxdt * dt * acc
var y = q[1][1] + dydt * dt * acc

q.shift()
q.push([x,y,time])

*/
