import type { D3BrushEvent } from "d3-brush";
import type { Selection } from "d3-selection";
import { zoomIdentity } from "d3-zoom";
import type { ChartData } from "../chart/data.ts";
import type { RenderState } from "../chart/render.ts";
import type { ZoomState } from "../chart/zoomState.ts";

/**
 * Handle a brush end event and apply the corresponding zoom transform.
 *
 * Returns the selected time window in epoch milliseconds, or `null` if
 * the selection was empty or invalid.
 */
export function handleBrushEnd(
  event: D3BrushEvent<unknown>,
  data: ChartData,
  state: RenderState,
  zoomState: ZoomState,
  zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
): [number, number] | null {
  if (!event.selection) {
    return null;
  }
  let [x0, x1] = event.selection as [number, number];
  if (x0 === x1) {
    return null;
  }
  if (x1 < x0) {
    [x0, x1] = [x1, x0];
  }
  const m0 = data.clampIndex(state.screenToModelX(x0));
  const m1 = data.clampIndex(state.screenToModelX(x1));
  const sx0 = state.axes.x.scale(m0);
  const sx1 = state.axes.x.scale(m1);
  if (m0 === m1 || sx0 === sx1) {
    return null;
  }
  const { width } = state.getDimensions();
  const k = width / (sx1 - sx0);
  const t = zoomIdentity.scale(k).translate(-sx0, 0);
  zoomState.zoomBehavior.transform(zoomArea, t);
  const t0 = +data.indexToTime(m0);
  const t1 = +data.indexToTime(m1);
  return [t0, t1];
}
