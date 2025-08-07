export interface ILegendController {
  onHover: (idx: number) => void;
  refresh: () => void;
  destroy: () => void;
}
