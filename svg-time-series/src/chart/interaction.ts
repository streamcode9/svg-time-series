import { BaseType, Selection } from "d3-selection";
import {
  zoom as d3zoom,
  D3ZoomEvent,
  ZoomTransform,
  ZoomBehavior,
} from "d3-zoom";
import { drawProc } from "../utils/drawProc.ts";
import type { ChartData } from "./data.ts";
import type { RenderState } from "./render.ts";
import { refreshChart } from "./render.ts";
import { renderPaths } from "./render/paths.ts";
import { LegendController } from "./legend.ts";

export class ChartInteraction {
  private zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomArea: Selection<SVGRectElement, unknown, BaseType, unknown>;

  private currentPanZoomTransformState: ZoomTransform | null = null;

  private scheduleRefresh: () => void;
  private legendController: LegendController;

  constructor(
    svg: Selection<BaseType, unknown, HTMLElement, unknown>,
    legend: Selection<BaseType, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private data: ChartData,
    zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
    mouseMoveHandler: (event: MouseEvent) => void,
    formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .on("zoom", (event: D3ZoomEvent<Element, unknown>) => {
        zoomHandler(event);
        this.zoom(event);
      });

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", state.dimensions.width)
      .attr("height", state.dimensions.height)
      .call(this.zoomBehavior);
    this.zoomArea.on("mousemove", mouseMoveHandler);
    this.scheduleRefresh = drawProc(() => {
      if (this.currentPanZoomTransformState != null) {
        this.zoomBehavior.transform(
          this.zoomArea,
          this.currentPanZoomTransformState,
        );
      }
      refreshChart(this.state, this.data);
    });

    this.legendController = new LegendController(
      legend,
      state,
      data,
      formatTime,
    );
  }

  public zoom = (event: D3ZoomEvent<Element, unknown>) => {
    this.currentPanZoomTransformState = event.transform;
    this.state.transforms.ny.onZoomPan(event.transform);
    this.state.transforms.sf?.onZoomPan(event.transform);
    this.scheduleRefresh();
    this.legendController.refresh();
  };

  public onHover = (x: number) => {
    const idx = this.state.transforms.ny.fromScreenToModelX(x);
    this.legendController.onHover(idx);
  };

  public drawNewData = () => {
    renderPaths(this.state, this.data.data);
    this.scheduleRefresh();
    this.legendController.refresh();
  };

  public destroy = () => {
    this.zoomBehavior.on("zoom", null);
    this.zoomArea.on("mousemove", null);
    this.zoomArea.remove();
    this.legendController.destroy();
  };
}
