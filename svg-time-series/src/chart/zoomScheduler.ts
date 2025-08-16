import type { ZoomTransform } from "d3-zoom";
import { drawProc } from "../utils/drawProc.ts";

export const sameTransform = (a: ZoomTransform, b: ZoomTransform): boolean =>
  a.k === b.k && a.x === b.x && a.y === b.y;

export class ZoomScheduler {
  private currentPanZoomTransformState: ZoomTransform | null = null;
  private pendingZoomBehaviorTransform = false;
  private callback:
    | ((e: { transform: ZoomTransform; sourceEvent?: unknown }) => void)
    | null = null;
  private callbackEvent: {
    transform: ZoomTransform;
    sourceEvent?: unknown;
  } | null = null;
  private scheduleRefresh: () => void;
  private cancelRefresh: () => void;

  constructor(
    private applyTransform: (transform: ZoomTransform) => void,
    private refreshChart: () => void,
  ) {
    const { wrapped, cancel } = drawProc(() => {
      if (this.currentPanZoomTransformState != null) {
        const transform = this.currentPanZoomTransformState;
        this.currentPanZoomTransformState = null;
        this.applyTransform(transform);
        const cb = this.callback;
        const event = this.callbackEvent ?? { transform };
        this.callback = null;
        this.callbackEvent = null;
        cb?.(event);
      } else {
        this.refreshChart();
      }
    });
    this.scheduleRefresh = wrapped;
    this.cancelRefresh = cancel;
  }

  public zoom(
    transform: ZoomTransform,
    sourceEvent: unknown,
    event?: { transform: ZoomTransform; sourceEvent?: unknown },
    callback?: (e: { transform: ZoomTransform; sourceEvent?: unknown }) => void,
  ): boolean {
    const prevTransform = this.currentPanZoomTransformState;
    this.currentPanZoomTransformState = transform;
    if (callback) {
      this.callback = callback;
      this.callbackEvent = event ?? { transform };
    }
    // 1. direct user interaction, wait for d3 to emit final transform
    if (sourceEvent) {
      this.pendingZoomBehaviorTransform = true;
      this.scheduleRefresh();
      return true;
    }

    // 2. first programmatic transform before d3 zoom behavior fires
    if (!this.pendingZoomBehaviorTransform) {
      this.pendingZoomBehaviorTransform = true;
      this.scheduleRefresh();
      return true;
    }

    // 3. conflicting programmatic transform while waiting for refresh
    if (prevTransform !== null && !sameTransform(transform, prevTransform)) {
      this.currentPanZoomTransformState = prevTransform;
      return false;
    }

    // 4. final refresh after d3 confirms transform
    this.pendingZoomBehaviorTransform = false;
    this.scheduleRefresh();
    this.currentPanZoomTransformState = null;
    return true;
  }

  public refresh() {
    this.scheduleRefresh();
  }

  public destroy() {
    this.cancelRefresh();
    this.currentPanZoomTransformState = null;
    this.pendingZoomBehaviorTransform = false;
  }

  public getCurrentTransform(): ZoomTransform | null {
    return this.currentPanZoomTransformState;
  }

  public isPending(): boolean {
    return this.pendingZoomBehaviorTransform;
  }
}
