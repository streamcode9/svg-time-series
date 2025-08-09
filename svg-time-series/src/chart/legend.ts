import type { ViewportTransform } from "../ViewportTransform.ts";

export interface LegendSeriesInfo {
  path: SVGPathElement;
  transform: ViewportTransform;
}

export interface LegendContext {
  getPoint(idx: number): { values: number[]; timestamp: number };
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
