import type { ScaleContinuousNumeric } from "d3-scale";

/**
 * Build a DOMMatrix representing the mapping from the provided domain to range
 * along the given axis. The supplied matrix is treated as a base value and will
 * not be modified; instead a new matrix with the transform applied is returned.
 */
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
  const m = new DOMMatrix().multiply(sm);
  return axis === "x"
    ? m.translateSelf(b, 0).scaleSelf(a, 1)
    : m.translateSelf(0, b).scaleSelf(1, a);
}

/**
 * Convert a D3 scale's domain and range into a DOMMatrix along a specific axis.
 *
 * The returned matrix is a new instance based on `sm`; the supplied matrix is
 * left unmodified.
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
 * Combine independent X and Y scales into a single DOMMatrix. A new matrix with
 * both transforms applied is returned; the provided matrix is never mutated.
 */
export function scalesToDomMatrix(
  scaleX: ScaleContinuousNumeric<number, number>,
  scaleY: ScaleContinuousNumeric<number, number>,
  sm: DOMMatrix = new DOMMatrix(),
): DOMMatrix {
  const mx = scaleToDomMatrix(scaleX, "x", sm);
  return scaleToDomMatrix(scaleY, "y", mx);
}
