import type { ScaleContinuousNumeric } from "d3-scale";

function matrixFromDomainRange(
  domain: [number, number],
  range: [number, number],
  axis: "x" | "y",
  sm: DOMMatrix,
): DOMMatrix {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const a = (r1 - r0) / (d1 - d0);
  const b = r0 - d0 * a;
  return axis === "x"
    ? sm.translate(b, 0).scale(a, 1)
    : sm.translate(0, b).scale(1, a);
}

/**
 * Convert a D3 scale's domain and range into a DOMMatrix along a specific axis.
 */
export function scaleToDomMatrix(
  scale: ScaleContinuousNumeric<number, number>,
  axis: "x" | "y" = "x",
  sm: DOMMatrix = new DOMMatrix(),
): DOMMatrix {
  return matrixFromDomainRange(
    scale.domain() as [number, number],
    scale.range() as [number, number],
    axis,
    sm,
  );
}

/**
 * Combine independent X and Y scales into a single DOMMatrix.
 */
export function scalesToDomMatrix(
  scaleX: ScaleContinuousNumeric<number, number>,
  scaleY: ScaleContinuousNumeric<number, number>,
  sm: DOMMatrix = new DOMMatrix(),
): DOMMatrix {
  return scaleToDomMatrix(scaleY, "y", scaleToDomMatrix(scaleX, "x", sm));
}
