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
  scaleExtent?: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private currentPanZoomTransformState: ZoomTransform | null = null;
  private scheduleRefresh: () => void;
  private cancelRefresh: () => void;
  private scaleExtent: [number, number];

  constructor(
    private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private refreshChart: () => void,
    private zoomCallback: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    options: IZoomStateOptions = {},
  ) {
    this.scaleExtent = options.scaleExtent ?? [1, 40];
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
      } else {
        this.refreshChart();
      }
    });
    this.scheduleRefresh = wrapped;
    this.cancelRefresh = cancel;
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.currentPanZoomTransformState = event.transform;
    this.state.transforms.ny.onZoomPan(event.transform);
    this.state.transforms.sf?.onZoomPan(event.transform);
    if (event.sourceEvent) {
      this.scheduleRefresh();
    }
    if (!event.sourceEvent) {
      this.refreshChart();
    }
    this.zoomCallback(event);
  };

  public refresh = () => {
    this.scheduleRefresh();
  };

  public setScaleExtent = (extent: [number, number]) => {
    this.scaleExtent = extent;
    this.zoomBehavior.scaleExtent(extent);
  };

  public updateExtents = (dimensions: { width: number; height: number }) => {
    this.state.dimensions.width = dimensions.width;
    this.state.dimensions.height = dimensions.height;
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
