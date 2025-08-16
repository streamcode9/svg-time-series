export type Basis = [number, number];
export type DirectProductBasis = [Basis, Basis];

export const bPlaceholder: Basis = [0, 1];

export function toDirectProductBasis(bx: Basis, by: Basis): DirectProductBasis {
  return [bx, by];
}

export function basisRange(b: Basis): number {
  return Math.abs(b[1] - b[0]);
}
