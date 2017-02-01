import { select, event as d3event } from 'd3-selection'
import { range } from 'd3-array'
import { measureAll } from '../bench'
import { zoom } from 'd3-zoom'
import { ViewWindowTransform } from '../../ViewWindowTransform'
import { transformVector, pSubP, pSubV, Vector, newVector, newPoint } from '../../affine'
import { test } from '../../viewZoomTransform'

var svg = select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var points = range(2000).map(phyllotaxis(10));

var g = svg.append("g");

const svgNode = svg.node() as SVGSVGElement

test(svgNode)

g.selectAll("circle")
    .data(points)
  .enter().append("circle")
    .attr("cx", function(d) { return d[0]; })
    .attr("cy", function(d) { return d[1]; })
    .attr("r", 2.5);

svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .call(zoom()
        .scaleExtent([1, 1])
        .on("zoom", zoomed));

const viewNode: SVGGElement = g.node() as SVGGElement
const t = new ViewWindowTransform(viewNode.transform.baseVal)
t.setViewPort(width, width)

const rr = 500

function phyllotaxis(radius: number) {
  var theta = Math.PI * (3 - Math.sqrt(5));
  return function(i: number) {
    var r = radius * Math.sqrt(i), a = theta * i;
    return [
      r * Math.cos(a),
      r * Math.sin(a)
    ];
  };
}

var newZoom : string = null
let newZoomX = 0
var zoomCount = 0
var maxZoomCount = 0

// бескоординатная обертка вокруг координатного setViewWindow
function affineViewWindow(p1: SVGPoint, p2: SVGPoint) {
	t.setViewWindow(p1.x, p2.x, p1.y, p2.y)
}

// координаты нигде не фигурируют - этот код полностью в "аффинном сне"
function vecToModel(screenVector: Vector): Vector {
	const transformPoint = (point: SVGPoint) => t.fromScreenToModel(point)
	return transformVector(transformPoint, screenVector)
}

const draw = drawProc(function () {
    document.getElementById("misc").textContent = newZoomX.toString()

	const screenVector = newVector(newZoomX, 0)
	const p1 = newPoint(-rr, -rr)
	const p2 = newPoint(rr, rr)
	// в этом месте мы забыли про координаты - код ниже их
	// не упоминает, хотя внутри за барьером абстракции 
	// оперирует. Мы перешли в аффинный мир и выходим из
	// него только в самом конце - внутри affineViewWindow

	const modelVector = vecToModel(screenVector)	
	affineViewWindow(pSubV(p1, modelVector), pSubV(p2, modelVector))
})

draw()

function zoomed()
{
    zoomCount += 1
    const z = d3event.transform.toString()

    if (z != newZoom)
    {
        newZoom = z
		newZoomX = d3event.transform.x
        draw()
    }
}

function drawProc(f: (time: number) => void) {
    var requested = false
    
    return function () {
        if (!requested)
        {
            requested = true
            requestAnimationFrame(function (time)
            {
                requested = false
                f(time)
            })
        }
    }
}

measureAll()

