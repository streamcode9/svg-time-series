import type { Selection } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import type { D3ZoomEvent, ZoomBehavior, ZoomTransform } from "d3-zoom";
import { ZoomScheduler, sameTransform } from "./zoomScheduler.ts";
import type { RenderState } from "./render.ts";
import { validateScaleExtent } from "./zoomUtils.ts";

export { sameTransform };

interface D3ZoomEventWithSource {
  transform: ZoomTransform;
  sourceEvent?: unknown;
}

interface SchedulerEvent {
  transform: ZoomTransform;
  sourceEvent?: unknown;
}

export interface IZoomStateOptions {
  scaleExtent: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomScheduler: ZoomScheduler;
  private scaleExtent: [number, number];
  private destroyed = false;
  private zoomAreaNode: SVGRectElement;
  private nextSourceEventOverride: { sourceEvent: unknown } | null = null;
  private readonly constrain = (
    transform: ZoomTransform,
    extent: [[number, number], [number, number]],
    translateExtent: [[number, number], [number, number]],
  ): ZoomTransform => {
    const x0 = transform.invertX(extent[0][0]) - translateExtent[0][0];
    const x1 = transform.invertX(extent[1][0]) - translateExtent[1][0];
    const y0 = transform.invertY(extent[0][1]) - translateExtent[0][1];
    const y1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
    const tx = x1 > x0 ? (x0 + x1) / 2 : Math.min(0, x0) || Math.max(0, x1);
    const ty = y1 > y0 ? (y0 + y1) / 2 : Math.min(0, y0) || Math.max(0, y1);
    return tx !== 0 || ty !== 0 ? transform.translate(tx, ty) : transform;
  };

  public setScaleExtent(extent: [number, number]): void {
    if (this.destroyed) {
      return;
    }
    this.scaleExtent = validateScaleExtent(extent);
    this.zoomBehavior.scaleExtent(this.scaleExtent);
    const current = zoomTransform(this.zoomAreaNode);
    const [min, max] = this.scaleExtent;
    const clampedK = Math.max(min, Math.min(max, current.k));
    if (clampedK !== current.k) {
      this.zoomBehavior.scaleTo(this.zoomArea, clampedK);
    } else {
      this.refreshChart();
    }
  }

  public updateExtents(dimensions: { width: number; height: number }): void {
    if (this.destroyed) {
      return;
    }
    const extent: [[number, number], [number, number]] = [
      [0, 0],
      [dimensions.width, dimensions.height],
    ];
    this.zoomBehavior.scaleExtent(this.scaleExtent).translateExtent(extent);
    const current = zoomTransform(this.zoomAreaNode);
    const constrained = this.zoomBehavior.constrain()(current, extent, extent);
    if (constrained !== current) {
      this.zoomBehavior.transform(this.zoomArea, constrained);
    }
  }

  constructor(
    private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private refreshChart: () => void,
    private zoomCallback: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    options: IZoomStateOptions = { scaleExtent: [1, 40] },
  ) {
    this.scaleExtent = validateScaleExtent(options.scaleExtent);
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .constrain(this.constrain)
      .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        this.zoom(event);
      });

    this.zoomArea.call(this.zoomBehavior);

    const zoomAreaNode = this.zoomArea.node();
    if (!zoomAreaNode) {
      throw new Error("zoom area element not found");
    }
    this.zoomAreaNode = zoomAreaNode;

    this.zoomScheduler = new ZoomScheduler((t: ZoomTransform) => {
      this.zoomBehavior.transform(this.zoomArea, t);
    }, this.refreshChart);
  }

  /**
   * Temporarily overrides the next d3-zoom event's `sourceEvent` when it would
   * otherwise be `null`/`undefined` (e.g. a programmatic zoom transform
   * triggered from a user-driven brush selection).
   */
  public withNextSourceEventOverride<T>(sourceEvent: unknown, fn: () => T): T {
    this.nextSourceEventOverride = { sourceEvent };
    return fn();
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.state.applyZoomTransform(event.transform);

    // Capture and clear override immediately for thread safety
    const override = this.nextSourceEventOverride;
    this.nextSourceEventOverride = null;

    const rawSourceEvent = (event as unknown as D3ZoomEventWithSource)
      .sourceEvent;

    // d3-zoom sets `sourceEvent` for user interactions, but it is `null` for
    // programmatic transforms. When a programmatic transform is initiated from
    // a user-driven interaction (e.g. brushing), callers can provide a one-shot
    // override.
    const overrideUsed = rawSourceEvent == null && override !== null;
    const sourceEvent: unknown = overrideUsed
      ? override.sourceEvent
      : rawSourceEvent;

    const schedulerEvent: SchedulerEvent = {
      transform: event.transform,
      sourceEvent,
    };

    // When the scheduler applies a transform, d3-zoom will emit a follow-up
    // event with `sourceEvent == null` while we are still pending. That
    // follow-up event finalizes internal state but should not overwrite the
    // callback event established by the initiating interaction.
    const shouldUpdateCallback = !(
      rawSourceEvent == null && this.zoomScheduler.isPending()
    );

    this.zoomScheduler.zoom(
      event.transform,
      sourceEvent,
      schedulerEvent,
      shouldUpdateCallback
        ? (e) => {
            this.zoomCallback(e as D3ZoomEvent<SVGRectElement, unknown>);
          }
        : undefined,
    );
  };

  public refresh = () => {
    this.zoomScheduler.refresh();
  };

  public reset = () => {
    this.zoomBehavior.transform(this.zoomArea, zoomIdentity);
  };

  public destroy = () => {
    this.destroyed = true;
    this.zoomScheduler.destroy();
    this.zoomArea.on(".zoom", null);
    this.zoomBehavior.on("zoom", null);
  };
}

export type { D3ZoomEvent };
