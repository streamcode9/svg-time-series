export interface ILegendController {
  highlightIndex(idx: number): void;
  refresh(): void;
  clearHighlight(): void;
  destroy(): void;
}
