import { ScaleLinear, ScaleTime, scaleLinear, scaleTime } from "d3-scale";
import { AR1Basis } from "../../math/affine.ts";
import { SegmentTree } from "../../segmentTree.ts";
import { ViewportTransform } from "../../ViewportTransform.ts";
import type { ChartData } from "../data.ts";

export interface ScaleSet {
  x: ScaleTime<number, number>;
  yNy: ScaleLinear<number, number>;
  ySf?: ScaleLinear<number, number>;
}

export function createScales(
  bScreenXVisible: AR1Basis,
  bScreenYVisible: AR1Basis,
  hasSf: boolean,
): ScaleSet {
  const x: ScaleTime<number, number> = scaleTime().range(
    bScreenXVisible.toArr(),
  );
  const yNy: ScaleLinear<number, number> = scaleLinear().range(
    bScreenYVisible.toArr(),
  );
  let ySf: ScaleLinear<number, number> | undefined;
  if (hasSf) {
    ySf = scaleLinear().range(bScreenYVisible.toArr());
  }
  return { x, yNy, ySf };
}

export function updateScaleX(
  x: ScaleTime<number, number>,
  bIndexVisible: AR1Basis,
  data: ChartData,
) {
  const bTimeVisible = bIndexVisible.transformWith(data.idxToTime);
  x.domain(bTimeVisible.toArr());
}

export function updateScaleY(
  bIndexVisible: AR1Basis,
  tree: SegmentTree,
  pathTransform: ViewportTransform,
  yScale: ScaleLinear<number, number>,
  data: ChartData,
) {
  const bTemperatureVisible = data.bTemperatureVisible(bIndexVisible, tree);
  pathTransform.onReferenceViewWindowResize(
    data.bIndexFull,
    bTemperatureVisible,
  );
  yScale.domain(bTemperatureVisible.toArr());
}
