function isSVGMatrix(
  matrix: DOMMatrix,
  svg: SVGSVGElement,
): matrix is SVGMatrix {
  const prototypeMatrix = (
    svg as unknown as { createSVGMatrix: () => DOMMatrix }
  ).createSVGMatrix();
  const hasSVGMatrix =
    typeof SVGMatrix !== "undefined" && !(prototypeMatrix instanceof DOMMatrix);
  if (!hasSVGMatrix) {
    return false;
  }
  if (matrix instanceof DOMMatrix) {
    return false;
  }
  return "a" in matrix && "b" in matrix;
}

export function domMatrixToSVGMatrix(
  svg: SVGSVGElement,
  m: DOMMatrix,
): SVGMatrix {
  if (isSVGMatrix(m, svg)) {
    return m;
  }
  const sm = (
    svg as unknown as { createSVGMatrix: () => DOMMatrix }
  ).createSVGMatrix();
  sm.multiplySelf(m);
  return sm as unknown as SVGMatrix;
}

export function updateNode(n: SVGGraphicsElement, m: DOMMatrix) {
  const svg = n instanceof SVGSVGElement ? n : n.ownerSVGElement;
  if (!svg) {
    throw new Error("Cannot update transform: SVG root not found");
  }
  const matrix = domMatrixToSVGMatrix(svg, m);
  const components = [
    matrix.a,
    matrix.b,
    matrix.c,
    matrix.d,
    matrix.e,
    matrix.f,
  ].join(",");
  n.setAttribute("transform", `matrix(${components})`);
}
