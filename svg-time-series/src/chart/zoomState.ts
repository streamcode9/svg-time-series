import { Selection } from "d3-selection";
import {
  zoom as d3zoom,
  D3ZoomEvent,
  ZoomBehavior,
  ZoomTransform,
  zoomIdentity,
} from "d3-zoom";
import { drawProc } from "../utils/drawProc.ts";
import type { RenderState } from "./render.ts";

export interface IZoomStateOptions {
  scaleExtent: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private currentPanZoomTransformState: ZoomTransform | null = null;
  private pendingZoomBehaviorTransform = false;
  private scheduleRefresh: () => void;
  private cancelRefresh: () => void;
  private scaleExtent: [number, number];
  private validateScaleExtent(extent: [number, number]) {
    if (!Array.isArray(extent) || extent.length !== 2) {
      throw new Error(
        `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: ${extent}`,
      );
    }
    const [min, max] = extent;
    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min <= 0 ||
      max <= 0 ||
      min >= max
    ) {
      throw new Error(
        `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: [${extent}]`,
      );
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
    this.validateScaleExtent(options.scaleExtent);
    this.scaleExtent = options.scaleExtent;
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        this.zoom(event);
      });

    this.zoomArea.call(this.zoomBehavior);

    const { wrapped, cancel } = drawProc(() => {
      if (this.currentPanZoomTransformState != null) {
        this.zoomBehavior.transform(
          this.zoomArea,
          this.currentPanZoomTransformState,
        );
        this.currentPanZoomTransformState = null;
      } else {
        this.refreshChart();
      }
    });
    this.scheduleRefresh = wrapped;
    this.cancelRefresh = cancel;
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    const prevTransform = this.currentPanZoomTransformState;
    this.currentPanZoomTransformState = event.transform;
    this.state.axes.y.forEach((a) => a.transform.onZoomPan(event.transform));
    if (event.sourceEvent) {
      this.pendingZoomBehaviorTransform = true;
      this.scheduleRefresh();
    } else if (!this.pendingZoomBehaviorTransform) {
      this.pendingZoomBehaviorTransform = true;
      this.zoomBehavior.transform(
        this.zoomArea,
        this.currentPanZoomTransformState,
      );
    } else if (prevTransform !== null && event.transform !== prevTransform) {
      this.currentPanZoomTransformState = prevTransform;
      return;
    } else {
      this.pendingZoomBehaviorTransform = false;
      this.refreshChart();
      this.currentPanZoomTransformState = null;
    }
    this.zoomCallback(event);
  };

  public refresh = () => {
    this.scheduleRefresh();
  };

  public setScaleExtent = (extent: [number, number]) => {
    this.validateScaleExtent(extent);
    this.scaleExtent = extent;
    this.zoomBehavior.scaleExtent(extent);
  };

  public updateExtents = (dimensions: { width: number; height: number }) => {
    this.state.dimensions.width = dimensions.width;
    this.state.dimensions.height = dimensions.height;
    this.zoomArea
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);
    this.zoomBehavior.scaleExtent(this.scaleExtent).translateExtent([
      [0, 0],
      [dimensions.width, dimensions.height],
    ]);
  };

  public reset = () => {
    this.zoomBehavior.transform(this.zoomArea, zoomIdentity);
  };

  public destroy = () => {
    this.cancelRefresh();
    this.zoomArea.on(".zoom", null);
    this.zoomBehavior.on("zoom", null);
  };
}

export type { D3ZoomEvent };
