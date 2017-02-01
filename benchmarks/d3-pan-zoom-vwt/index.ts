import { select, event as d3event } from 'd3-selection'
import { range } from 'd3-array'
import { measureAll } from '../bench'
import { zoom, ZoomTransform } from 'd3-zoom'
import { ViewWindowTransform } from '../../ViewWindowTransform'
import { transformVector, pSubP, pSubV, Vector, newVector, newPoint, identityTransform } from '../../affine'
import { test } from '../../viewZoomTransform'

var svg = select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var points = range(2000).map(phyllotaxis(10));

var g = svg.append("g");


// var refNode: SVGGElement = svg.append("g").node() as SVGGElement
const svgNode = svg.node() as SVGSVGElement

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

//const rr = 500
const viewNode: SVGGElement = g.node() as SVGGElement
test(svgNode, viewNode)
	
/*
const refT = new ViewWindowTransform(refNode.transform.baseVal)
const p1 = newPoint(-rr, -rr)
const p2 = newPoint(rr, rr)



const corner1 = newPoint(0, 0)
const corner2 = newPoint(width, width)

t.setViewPort(width, width)
refT.setViewPort(width, width)
refT.setViewWindow(-rr, rr, -rr, rr)

//affineViewWindow(refT, p1, p2)

const aaa:  number = 0 + refT.fromScreenToModel(newPoint(0, 0)).x
const bbb:  number = 0 + refT.fromModelToScreen(newPoint(-rr, rr)).x
*/


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
let newZoomT = identityTransform()
var zoomCount = 0
var maxZoomCount = 0

/*
// бескоординатная обертка вокруг координатного setViewWindow
function affineViewWindow(t: ViewWindowTransform, p1: SVGPoint, p2: SVGPoint) : void {
	t.setViewWindow(p1.x, p2.x, p1.y, p2.y)
}

// координаты нигде не фигурируют - этот код полностью в "аффинном сне"
function vecToModel(screenVector: Vector): Vector {
	const transformPoint = (point: SVGPoint) => t.fromScreenToModel(point)
	return transformVector(transformPoint, screenVector)
}
*/

function zoomAffineTransform(t: ZoomTransform) {
	return identityTransform().translate(-t.x, 0) //.scaleNonUniform(t.k, 1)
}

const draw = drawProc(function () {
    

	// const screenVector = newVector(newZoomX, 0)
	// const p1 = newPoint(-rr, -rr).matrixTransform(t)
	// const p2 = newPoint(rr, rr).matrixTransform(t)
	// в этом месте мы забыли про координаты - код ниже их
	// не упоминает, хотя внутри за барьером абстракции 
	// оперирует. Мы перешли в аффинный мир и выходим из
	// него только в самом конце - внутри affineViewWindow

	

	const revZoom = identityTransform() // newZoomT.inverse()

//	const corner1m = refT.fromScreenToModel(corner1.matrixTransform(revZoom))
//	const corner2m = refT.fromScreenToModel(corner2.matrixTransform(revZoom))
//	document.getElementById("misc").textContent = `${corner2m.x}`

//	affineViewWindow(t, corner1m, corner2m)
	// const modelVector = vecToModel(screenVector)	
	// affineViewWindow(pSubV(p1, modelVector), pSubV(p2, modelVector))
})

draw()

function zoomed()
{
    zoomCount += 1
    const z = d3event.transform.toString()

    if (z != newZoom)
    {
        newZoom = z
		newZoomT = zoomAffineTransform(d3event.transform)
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

