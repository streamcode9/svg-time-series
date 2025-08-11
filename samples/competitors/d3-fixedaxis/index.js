var top = 1,
  right = 2,
  bottom = 3,
  left = 4,
  epsilon = 1e-6;

var slice = Array.prototype.slice;

var identity = function (x) {
  return x;
};

function myAxis(orient, scale) {
  var tickArguments = [],
    tickValues = null,
    tickFormat = null,
    tickSizeInner = 6,
    tickSizeOuter = 6,
    tickPadding = 3;

  function axis(context) {
    var values =
        tickValues == null
          ? scale.ticks
            ? scale.ticks(...tickArguments)
            : scale.domain()
          : tickValues,
      format =
        tickFormat == null
          ? scale.tickFormat
            ? scale.tickFormat(...tickArguments)
            : identity
          : tickFormat,
      spacing = Math.max(tickSizeInner, 0) + tickPadding,
      transform = orient === top || orient === bottom ? translateX : translateY,
      range = scale.range(),
      range0 = range[0] + 0.5,
      range1 = range[range.length - 1] + 0.5,
      position = (scale.bandwidth ? center : identity)(scale.copy()),
      selection = context.selection ? context.selection() : context,
      path = selection.selectAll(".domain").data([null]),
      tick = selection.selectAll(".tick").data(values, scale).order(),
      tickExit = tick.exit(),
      tickEnter = tick.enter().append("g", ".domain").attr("class", "tick"),
      line = tick.select("line"),
      text = tick.select("text"),
      k = orient === top || orient === left ? -1 : 1,
      x,
      y =
        orient === left || orient === right
          ? ((x = "x"), "y")
          : ((x = "y"), "x");

    path = path.merge(
      path
        .enter()
        .append("path")
        .attr("class", "domain")
        .attr("stroke", "#000"),
    );

    tick = tick.merge(tickEnter);

    line = line.merge(
      tickEnter
        .append("line")
        .attr("stroke", "#000")
        .attr(x + "2", k * tickSizeInner)
        .attr(y + "1", 0.5)
        .attr(y + "2", 0.5),
    );

    text = text.merge(
      tickEnter
        .append("text")
        .attr("fill", "#000")
        .attr(x, k * spacing)
        .attr(y, 0.5)
        .attr(
          "dy",
          orient === top ? "0em" : orient === bottom ? ".71em" : ".32em",
        ),
    );

    if (context !== selection) {
      path = path.transition(context);
      tick = tick.transition(context);
      line = line.transition(context);
      text = text.transition(context);

      tickExit = tickExit
        .transition(context)
        .attr("opacity", epsilon)
        .attr("transform", function (d) {
          return transform(position, this.parentNode.__axis || position, d);
        });

      tickEnter.attr("opacity", epsilon).attr("transform", function (d) {
        return transform(this.parentNode.__axis || position, position, d);
      });
    }

    tickExit.remove();

    path.attr(
      "d",
      orient === left || orient == right
        ? "M" +
            k * tickSizeOuter +
            "," +
            range0 +
            "H0.5V" +
            range1 +
            "H" +
            k * tickSizeOuter
        : "M" +
            range0 +
            "," +
            k * tickSizeOuter +
            "V0.5H" +
            range1 +
            "V" +
            k * tickSizeOuter,
    );

    tick.attr("opacity", 1).attr("transform", function (d) {
      return transform(position, position, d);
    });

    line.attr(x + "2", k * tickSizeInner);

    text.attr(x, k * spacing).text(format);

    selection
      .filter(function () {
        return !this.__axis;
      })
      .attr("fill", "none")
      .attr("font-size", 10)
      .attr("font-family", "sans-serif")
      .attr(
        "text-anchor",
        orient === right ? "start" : orient === left ? "end" : "middle",
      );

    selection.each(function () {
      this.__axis = position;
    });
  }

  function axisUp(context) {
    var values =
        tickValues == null
          ? scale.ticks
            ? scale.ticks(...tickArguments)
            : scale.domain()
          : tickValues,
      format =
        tickFormat == null
          ? scale.tickFormat
            ? scale.tickFormat(...tickArguments)
            : identity
          : tickFormat,
      spacing = Math.max(tickSizeInner, 0) + tickPadding,
      transform = orient === top || orient === bottom ? translateX : translateY,
      range = scale.range(),
      range0 = range[0] + 0.5,
      range1 = range[range.length - 1] + 0.5,
      position = (scale.bandwidth ? center : identity)(scale.copy()),
      selection = context.selection ? context.selection() : context,
      path = selection.selectAll(".domain").data([null]),
      tick = selection.selectAll(".tick").data(values, scale).order(),
      tickExit = tick.exit(),
      tickEnter = tick.enter().append("g", ".domain").attr("class", "tick"),
      k = orient === top || orient === left ? -1 : 1,
      x,
      y =
        orient === left || orient === right
          ? ((x = "x"), "y")
          : ((x = "y"), "x");

    path = path.merge(
      path
        .enter()
        .append("path")
        .attr("class", "domain")
        .attr("stroke", "#000"),
    );

    path.attr(
      "d",
      orient === left || orient == right
        ? "M" +
            k * tickSizeOuter +
            "," +
            range0 +
            "H0.5V" +
            range1 +
            "H" +
            k * tickSizeOuter
        : "M" +
            range0 +
            "," +
            k * tickSizeOuter +
            "V0.5H" +
            range1 +
            "V" +
            k * tickSizeOuter,
    );

    tickEnter
      .append("line")
      .attr("stroke", "#000")
      .attr(x + "2", k * tickSizeInner)
      .attr(y + "1", 0.5)
      .attr(y + "2", 0.5)
      .attr("opacity", 1);

    tickEnter
      .append("text")
      .attr("fill", "#000")
      .attr(x, k * spacing)
      .attr(y, 0.5)
      .attr(
        "dy",
        orient === top ? "0em" : orient === bottom ? ".71em" : ".32em",
      )
      .text(format);

    tickExit.remove();
    tick.attr("transform", function (d) {
      return transform(position, position, d);
    });

    /*
    selection
        .attr("fill", "none")
        .attr("font-size", 10)
        .attr("font-family", "sans-serif")
        .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle")
        .each(function() { this.__axis = position; });
*/
  }

  axis.scale = function (_) {
    return arguments.length ? ((scale = _), axis) : scale;
  };

  axis.ticks = function () {
    return ((tickArguments = slice.call(arguments)), axis);
  };

  axis.tickArguments = function (_) {
    return arguments.length
      ? ((tickArguments = _ == null ? [] : slice.call(_)), axis)
      : tickArguments.slice();
  };

  axis.tickValues = function (_) {
    return arguments.length
      ? ((tickValues = _ == null ? null : slice.call(_)), axis)
      : tickValues && tickValues.slice();
  };

  axis.tickFormat = function (_) {
    return arguments.length ? ((tickFormat = _), axis) : tickFormat;
  };

  axis.tickSize = function (_) {
    return arguments.length
      ? ((tickSizeInner = tickSizeOuter = +_), axis)
      : tickSizeInner;
  };

  axis.tickSizeInner = function (_) {
    return arguments.length ? ((tickSizeInner = +_), axis) : tickSizeInner;
  };

  axis.tickSizeOuter = function (_) {
    return arguments.length ? ((tickSizeOuter = +_), axis) : tickSizeOuter;
  };

  axis.tickPadding = function (_) {
    return arguments.length ? ((tickPadding = +_), axis) : tickPadding;
  };

  axis.axisUp = axisUp;

  return axis;
}

function translateX(scale0, scale1, d) {
  var x = scale0(d);
  return "translate(" + (isFinite(x) ? x : scale1(d)) + ",0)";
}

function translateY(scale0, scale1, d) {
  var y = scale0(d);
  return "translate(0," + (isFinite(y) ? y : scale1(d)) + ")";
}

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

var xAxis = myAxis(bottom, x)
  .ticks(((width + 2) / (height + 2)) * 10)
  .tickSize(height)
  .tickPadding(8 - height);

var yAxis = myAxis(right, y)
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

  xAxis.scale(rx).axisUp(gX);
  yAxis.scale(ry).axisUp(gY);

  // gY.call(yAxis.scale(ry));
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
