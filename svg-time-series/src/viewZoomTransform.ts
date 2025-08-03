import { AR1, DirectProduct } from './math/affine.ts';

export interface MatrixLike {
  translate(tx: number, ty: number): MatrixLike;
  scaleNonUniform(sx: number, sy: number): MatrixLike;
}

export function applyAR1ToMatrixX<M extends MatrixLike>(transform: AR1, sm: M): M {
  const [a, b] = transform.m;
  return sm.translate(b, 0).scaleNonUniform(a, 1);
}

export function applyAR1ToMatrixY<M extends MatrixLike>(transform: AR1, sm: M): M {
  const [a, b] = transform.m;
  return sm.translate(0, b).scaleNonUniform(1, a);
}

export function applyDirectProductToMatrix<M extends MatrixLike>(
  dp: DirectProduct,
  sm: M,
): M {
  return applyAR1ToMatrixY(dp.s2, applyAR1ToMatrixX(dp.s1, sm));
}

export function updateNode(n: SVGGraphicsElement, m: SVGMatrix) {
  const svgTranformList = n.transform.baseVal;
  const t = svgTranformList.createSVGTransformFromMatrix(m);
  svgTranformList.initialize(t);
}
