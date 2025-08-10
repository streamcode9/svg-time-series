import type { ViewportTransform } from "../ViewportTransform.ts";

export interface LegendSeriesInfo {
  path: SVGPathElement;
  transform: ViewportTransform;
}

export type LegendPoint =
  | { values: number[]; timestamp: number }
  | [number, ...number[]];

export interface LegendContext {
  getPoint(idx: number): LegendPoint;
  length: number;
  series: readonly LegendSeriesInfo[];
}

export interface ILegendController {
  init(context: LegendContext): void;
  highlightIndex(idx: number): void;
  refresh(): void;
  clearHighlight(): void;
  destroy(): void;
}
