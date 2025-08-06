import { AR1, DirectProduct } from "../math/affine.ts";

export function applyAR1ToMatrixX(transform: AR1, sm: DOMMatrix): DOMMatrix {
  const [a, b] = transform.m;
  return sm.translate(b, 0).scale(a, 1);
}

export function applyAR1ToMatrixY(transform: AR1, sm: DOMMatrix): DOMMatrix {
  const [a, b] = transform.m;
  return sm.translate(0, b).scale(1, a);
}

export function applyDirectProductToMatrix(
  dp: DirectProduct,
  sm: DOMMatrix,
): DOMMatrix {
  return applyAR1ToMatrixY(dp.s2, applyAR1ToMatrixX(dp.s1, sm));
}
