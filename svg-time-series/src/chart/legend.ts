import type { Selection } from "d3-selection";
import type { ViewportTransform } from "../ViewportTransform.ts";

export interface LegendSeriesInfo {
  pathSelection: Selection<SVGPathElement, unknown, HTMLElement, unknown>;
  transform: ViewportTransform;
}

export interface LegendPoint {
  values: number[];
  timestamp?: number;
}

export interface LegendContext {
  getPoint(idx: number): LegendPoint;
  getLength(): number;
  series: readonly LegendSeriesInfo[];
}

export interface ILegendController {
  init(context: LegendContext): void;
  highlightIndex(idx: number): void;
  highlightIndexRaf?(idx: number): void;
  refresh(): void;
  clearHighlight(): void;
  destroy(): void;
}
