export interface ILegendController {
  onHover: (idx: number) => void;
  refresh: () => void;
  clearHighlight: () => void;
  destroy: () => void;
}
