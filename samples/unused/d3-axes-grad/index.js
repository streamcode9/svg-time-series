var svg = d3.select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

var x = d3
  .scaleLinear()
  .domain([-1, width + 1])
  .range([-1, width + 1]);

var y = d3
  .scaleLinear()
  .domain([-1, height + 1])
  .range([-1, height + 1]);

var xAxis = d3
  .axisBottom(x)
  .ticks(((width + 2) / (height + 2)) * 10)
  .tickSize(height)
  .tickPadding(8 - height);

var yAxis = d3
  .axisRight(y)
  .ticks(10)
  .tickSize(width)
  .tickPadding(8 - width);

var view = svg
  .append("rect")
  .attr("class", "view")
  .attr("x", 0.5)
  .attr("y", 0.5)
  .attr("width", width - 1)
  .attr("height", height - 1);

var gX = svg.append("g").attr("class", "axis axis--x").call(xAxis);

var gY = svg.append("g").attr("class", "axis axis--y").call(yAxis);

svg
  .append("rect")
  .attr("class", "zoom")
  .attr("width", width)
  .attr("height", height)
  .call(
    d3
      .zoom()
      .scaleExtent([1, 40])
      .translateExtent([
        [-100, -100],
        [width + 90, height + 100],
      ])
      .on("zoom", zoomed),
  );

var newZoom = null;
var rx = null;
var ry = null;

var draw = drawProc(function () {
  view.attr("transform", newZoom);
  gX.call(xAxis.scale(rx));
  gY.call(yAxis.scale(ry));
});

function zoomed() {
  var z = d3.event.transform.toString();
  if (z != newZoom) {
    rx = d3.event.transform.rescaleX(x);
    ry = d3.event.transform.rescaleY(y);
    newZoom = z;
    draw();
  }
}

function drawProc(f) {
  var requested = false;

  return function () {
    if (!requested) {
      requested = true;
      d3.timeout(function (time) {
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

  d3.interval(function () {
    drawFPS((ctr / sec).toPrecision(3));
    ctr = 0;
  }, 1000 * sec);
}

measureFPS(3, function (fps) {
  document.getElementById("fps").textContent = fps;
});
