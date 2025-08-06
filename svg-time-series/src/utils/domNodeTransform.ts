export function updateNode(n: SVGGraphicsElement, m: DOMMatrix | SVGMatrix) {
  const svgTransformList = n.transform.baseVal;
  const t = svgTransformList.createSVGTransformFromMatrix(m);
  svgTransformList.initialize(t);
}
