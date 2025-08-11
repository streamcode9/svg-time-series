import type { Selection } from "d3-selection";
import { zoom as d3zoom, ZoomTransform, zoomIdentity } from "d3-zoom";
import type { D3ZoomEvent, ZoomBehavior } from "d3-zoom";
import { ZoomScheduler, sameTransform } from "./zoomScheduler.ts";
import type { RenderState } from "./render.ts";

export { sameTransform };

export interface IZoomStateOptions {
  scaleExtent: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomScheduler: ZoomScheduler;
  private scaleExtent: [number, number];

  public static validateScaleExtent(extent: unknown) {
    if (!Array.isArray(extent) || extent.length !== 2) {
      throw new Error(
        `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: ${Array.isArray(extent) ? extent.join(",") : String(extent)}`,
      );
    }
    const [min, max] = extent as [number, number];
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
        `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: [${extent.join(",")}]`,
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
    ZoomState.validateScaleExtent(options.scaleExtent);
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

    this.zoomScheduler = new ZoomScheduler((t: ZoomTransform) => {
      this.zoomBehavior.transform(this.zoomArea, t);
    }, this.refreshChart);
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.state.axes.y.forEach((a) => a.transform.onZoomPan(event.transform));
    if (!this.zoomScheduler.zoom(event.transform, event.sourceEvent)) {
      return;
    }
    this.zoomCallback(event);
  };

  public refresh = () => {
    this.zoomScheduler.refresh();
  };

  public setScaleExtent = (extent: [number, number]) => {
    ZoomState.validateScaleExtent(extent);
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
    this.zoomScheduler.destroy();
    this.zoomArea.on(".zoom", null);
    this.zoomBehavior.on("zoom", null);
  };
}

export type { D3ZoomEvent };
