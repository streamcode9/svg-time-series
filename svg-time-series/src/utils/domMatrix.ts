import type { ScaleContinuousNumeric } from "d3-scale";
import type { ZoomTransform } from "d3-zoom";

/**
 * Convert a D3 scale into a DOMMatrix along a specific axis. The matrix elements
 * are derived from `scale(0)` and `scale(1)` rather than manipulating the
 * domain and range manually. A new matrix is returned based on `sm`; the
 * supplied matrix itself is never mutated.
 */
export function scaleToDomMatrix(
  scale: ScaleContinuousNumeric<number, number>,
  axis: "x" | "y" = "x",
  sm: DOMMatrix = new DOMMatrix(),
): DOMMatrix {
  const m = DOMMatrix.fromMatrix(sm);
  const v0 = scale(0);
  const v1 = scale(1);
  if (axis === "x") {
    m.a *= v1 - v0;
    m.e += v0;
  } else {
    m.d *= v1 - v0;
    m.f += v0;
  }
  return m;
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

/**
 * Convert a D3 ZoomTransform into a DOMMatrix. The transform is represented by
 * `{k, x, y}` and directly mapped into the matrix elements. A new matrix is
 * returned and the supplied `sm` is left unmodified.
 */
export function zoomTransformToDomMatrix(
  t: ZoomTransform,
  sm: DOMMatrix = new DOMMatrix(),
): DOMMatrix {
  const z = DOMMatrix.fromMatrix(new DOMMatrix([t.k, 0, 0, t.k, t.x, t.y]));
  return sm.multiply(z);
}
