import { select } from "d3-selection";
import { range } from "d3-array";
import { measure, measureOnce } from "../../benchmarks/bench.ts";
import { zoom, ZoomTransform } from "d3-zoom";
import { betweenBasesAR1 } from "../../../svg-time-series/src/math/affine.ts";
import {
  applyAR1ToMatrixX,
  applyAR1ToMatrixY,
} from "../../../svg-time-series/src/utils/domMatrix.ts";
import { updateNode } from "../../../svg-time-series/src/utils/domNodeTransform.ts";

const svg = select("svg"),
  width = +svg.attr("width"),
  height = +svg.attr("height");

const factory: SVGSVGElement = svg.node() as SVGSVGElement;

export function identityTransform(): SVGMatrix {
  return factory.createSVGMatrix();
}

const points = range(2000).map(phyllotaxis(10));

const g = svg.append("g");

// var refNode: SVGGElement = svg.append("g").node() as SVGGElement
const svgNode = svg.node() as SVGSVGElement;

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
    zoom()
      .scaleExtent([1 / 16, 16])
      .on("zoom", zoomed),
  );

//const rr = 500
const viewNode: SVGGElement = g.node() as SVGGElement;
const zoomPan = test(svgNode, viewNode, width);

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
  const theta = Math.PI * (3 - Math.sqrt(5));
  return function (i: number) {
    const r = radius * Math.sqrt(i),
      a = theta * i;
    return [r * Math.cos(a), r * Math.sin(a)];
  };
}

let newZoom: string = null;
let newZoomT = identityTransform();
let zoomCount = 0;
const maxZoomCount = 0;

// бескоординатная обертка вокруг координатного setViewWindow
// координаты нигде не фигурируют - этот код полностью в "аффинном сне"
function zoomAffineTransform(t: ZoomTransform) {
  return identityTransform().translate(t.x, 0).scaleNonUniform(t.k, 1);
}

const draw = drawProc(function () {
  zoomPan(newZoomT);
  // в этом месте мы забыли про координаты - код ниже их
  // не упоминает, хотя внутри за барьером абстракции
  // оперирует. Мы перешли в аффинный мир и выходим из
  // него только в самом конце - внутри affineViewWindow
});

draw();

function zoomed(d3event: any) {
  zoomCount += 1;
  const z = d3event.transform.toString();

  if (z != newZoom) {
    newZoom = z;
    newZoomT = zoomAffineTransform(d3event.transform);
    draw();
  }
}

function drawProc(f: (time: number) => void) {
  let requested = false;

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

measure(3, ({ fps }) => {
  document.getElementById("fps").textContent = fps.toFixed(2);
});

measureOnce(60, ({ fps }) => {
  alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps.toFixed(2)}`);
});

function test(svgNode: SVGSVGElement, viewNode: SVGGElement, width: number) {
  const id = svgNode.createSVGMatrix();
  const affX = betweenBasesAR1([-550, 550], [0, width]);
  const affY = betweenBasesAR1([-550, 550], [0, width]);

  const m = applyAR1ToMatrixY(affY, applyAR1ToMatrixX(affX, id));

  const newPoint = (x: number, y: number) => {
    const p = svgNode.createSVGPoint();
    p.x = x;
    p.y = y;
    return p;
  };

  return (zoomMatrix: SVGMatrix) => {
    const zoomed = zoomMatrix.multiply(m);

    const rev = zoomed.inverse();
    const pp = newPoint(0, 0).matrixTransform(rev);
    document.getElementById("misc").textContent = `${pp.x}`;

    updateNode(viewNode, zoomed);
  };
}
