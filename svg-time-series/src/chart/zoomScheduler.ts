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
        this.refreshChart();
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

  /*
   * ZoomScheduler state transitions
   *
   *     [idle] -- user event/programmatic start --> [pending]
   *     [pending] -- conflicting transform --------> [pending] (ignored)
   *     [pending] -- finalize ---------------------> [idle]
   */
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
    if (sourceEvent) {
      return this.handleUserEvent();
    }

    if (!this.pendingZoomBehaviorTransform) {
      return this.handleProgrammaticStart();
    }

    if (prevTransform !== null && !sameTransform(transform, prevTransform)) {
      return this.handleProgrammaticConflict(prevTransform);
    }

    return this.finalizeTransform();
  }

  // idle -> pending (user interaction)
  private handleUserEvent(): boolean {
    this.pendingZoomBehaviorTransform = true;
    this.scheduleRefresh();
    return true;
  }

  // idle -> pending (programmatic start)
  private handleProgrammaticStart(): boolean {
    this.pendingZoomBehaviorTransform = true;
    this.scheduleRefresh();
    return true;
  }

  // pending -> pending (restore previous transform)
  private handleProgrammaticConflict(prevTransform: ZoomTransform): boolean {
    this.currentPanZoomTransformState = prevTransform;
    return false;
  }

  // pending -> idle
  private finalizeTransform(): boolean {
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
    this.callback = null;
    this.callbackEvent = null;
  }

  public getCurrentTransform(): ZoomTransform | null {
    return this.currentPanZoomTransformState;
  }

  public isPending(): boolean {
    return this.pendingZoomBehaviorTransform;
  }
}
