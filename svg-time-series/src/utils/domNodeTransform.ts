export function updateNode(n: SVGGraphicsElement, m: DOMMatrix | SVGMatrix) {
  const svgTransformList = n.transform.baseVal;
  const svg = (
    typeof SVGSVGElement !== "undefined" && n instanceof SVGSVGElement
      ? n
      : n.ownerSVGElement
  )!;

  function isSVGMatrix(matrix: DOMMatrix | SVGMatrix): matrix is SVGMatrix {
    return matrix.constructor === svg.createSVGMatrix().constructor;
  }

  let matrix: SVGMatrix;
  if (isSVGMatrix(m)) {
    matrix = m;
  } else {
    const sm = svg.createSVGMatrix();
    const dm = m as DOMMatrix;
    sm.a = dm.a;
    sm.b = dm.b;
    sm.c = dm.c;
    sm.d = dm.d;
    sm.e = dm.e;
    sm.f = dm.f;
    matrix = sm;
  }
  const t = svgTransformList.createSVGTransformFromMatrix(matrix);
  svgTransformList.initialize(t);
}
