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
  // Preferred mapping: map pixel -> time using the X time scale (the same
  // scale used for axis rendering), then map that time -> index. This makes
  // the brush selection align with the axis ticks and user expectation.
  const invTimeAtSel0 = state.axes.x.scale.invert(x0);
  const invTimeAtSel1 = state.axes.x.scale.invert(x1);
  const rawM0 = data.timeToIndex(invTimeAtSel0);
  const rawM1 = data.timeToIndex(invTimeAtSel1);
  // Clamp indices to valid data range.
  const m0 = data.clampIndex(rawM0);
  const m1 = data.clampIndex(rawM1);
  // Now derive canonical times from the clamped indices.
  const time0 = data.indexToTime(m0);
  const time1 = data.indexToTime(m1);
  const sx0 = state.axes.x.scale(time0);
  const sx1 = state.axes.x.scale(time1);
  // Treat nearly-equal screen positions as collapsed selection using an
  // epsilon to account for floating-point imprecision.
  if (m0 === m1 || Math.abs(sx1 - sx0) < 1e-6) {
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
