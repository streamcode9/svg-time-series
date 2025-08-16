import type { BrushBehavior } from "d3-brush";
import type { Selection } from "d3-selection";

interface BrushWithMove<Datum> extends BrushBehavior<Datum> {
  move(
    group: Selection<SVGGElement, Datum, HTMLElement, unknown>,
    selection: null,
    event?: Event,
  ): void;
}

/**
 * Programmatically clear a brush selection on the given layer using the
 * `brush.move` API.
 */
export function clearBrushSelection(
  brushBehavior: BrushBehavior<unknown>,
  layer: Selection<SVGGElement, unknown, HTMLElement, unknown>,
): void {
  (brushBehavior as BrushWithMove<unknown>).move(layer, null);
}
