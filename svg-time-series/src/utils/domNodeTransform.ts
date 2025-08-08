export function updateNode(n: SVGGraphicsElement, m: DOMMatrix | SVGMatrix) {
  const svgTransformList = n.transform.baseVal;
  const svg = n.ownerSVGElement ?? (n as unknown as SVGSVGElement);
  const ctor = svg.createSVGMatrix()
    .constructor as unknown as new () => SVGMatrix;
  let matrix: SVGMatrix;
  if (m instanceof ctor) {
    matrix = m as SVGMatrix;
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
