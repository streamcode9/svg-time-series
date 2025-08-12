export function isSVGMatrix(
  matrix: DOMMatrix,
  svg: SVGSVGElement,
): matrix is SVGMatrix {
  return matrix.constructor === svg.createSVGMatrix().constructor;
}

export function updateNode(n: SVGGraphicsElement, m: DOMMatrix) {
  const svgTransformList = n.transform.baseVal;
  const svg = (
    typeof SVGSVGElement !== "undefined" && n instanceof SVGSVGElement
      ? n
      : n.ownerSVGElement
  )!;

  let matrix: SVGMatrix;
  if (isSVGMatrix(m, svg)) {
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
