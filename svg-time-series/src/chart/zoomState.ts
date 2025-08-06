import { BaseType, Selection } from "d3-selection";
import {
  zoom as d3zoom,
  D3ZoomEvent,
  ZoomBehavior,
  ZoomTransform,
} from "d3-zoom";
import { drawProc } from "../utils/drawProc.ts";
import type { RenderState } from "./render.ts";

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private currentPanZoomTransformState: ZoomTransform | null = null;
  private scheduleRefresh: () => void;

  constructor(
    private zoomArea: Selection<SVGRectElement, unknown, BaseType, unknown>,
    private state: RenderState,
    private refreshChart: () => void,
    private zoomCallback: (
      event: D3ZoomEvent<Element, unknown>,
    ) => void = () => {},
  ) {
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .on("zoom", (event: D3ZoomEvent<Element, unknown>) => {
        this.zoom(event);
      });

    this.zoomArea.call(this.zoomBehavior);

    this.scheduleRefresh = drawProc(() => {
      if (this.currentPanZoomTransformState != null) {
        this.zoomBehavior.transform(
          this.zoomArea,
          this.currentPanZoomTransformState,
        );
      }
      this.refreshChart();
    });
  }

  public zoom = (event: D3ZoomEvent<Element, unknown>) => {
    this.currentPanZoomTransformState = event.transform;
    this.state.transforms.ny.onZoomPan(event.transform);
    this.state.transforms.sf?.onZoomPan(event.transform);
    this.scheduleRefresh();
    this.zoomCallback(event);
  };

  public refresh = () => {
    this.scheduleRefresh();
  };

  public destroy = () => {
    this.zoomBehavior.on("zoom", null);
  };
}

export type { D3ZoomEvent };
