import type { IMinMax } from "./axisData.ts";

export function buildMinMax(
  fst: Readonly<IMinMax>,
  snd: Readonly<IMinMax>,
): IMinMax {
  return {
    min: Math.min(fst.min, snd.min),
    max: Math.max(fst.max, snd.max),
  } as const;
}

export const minMaxIdentity: IMinMax = {
  min: Infinity,
  max: -Infinity,
};
