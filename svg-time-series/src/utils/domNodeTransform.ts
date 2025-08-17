export function updateNode(n: SVGGraphicsElement, m: DOMMatrix) {
  const components = [m.a, m.b, m.c, m.d, m.e, m.f].join(",");
  n.setAttribute("transform", `matrix(${components})`);
}
