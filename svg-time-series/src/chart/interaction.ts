import { BaseType, Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";
import type { ChartData } from "./data.ts";
import type { RenderState } from "./render.ts";
import { refreshChart } from "./render.ts";
import { renderPaths } from "./render/utils.ts";
import { LegendController } from "./legend.ts";
import { ZoomState } from "./zoomState.ts";

export class ChartInteraction {
  private zoomArea: Selection<SVGRectElement, unknown, BaseType, unknown>;
  private zoomState: ZoomState;
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
    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", state.dimensions.width)
      .attr("height", state.dimensions.height);
    this.zoomArea.on("mousemove", mouseMoveHandler);

    this.legendController = new LegendController(
      legend,
      state,
      data,
      formatTime,
    );

    this.zoomState = new ZoomState(
      this.zoomArea,
      state,
      () => refreshChart(this.state, this.data),
      (event) => {
        zoomHandler(event);
        this.legendController.refresh();
      },
    );
  }

  public zoom = (event: D3ZoomEvent<Element, unknown>) => {
    this.zoomState.zoom(event, false);
    this.legendController.refresh();
  };

  public onHover = (x: number) => {
    const idx = this.state.transforms.ny.fromScreenToModelX(x);
    this.legendController.onHover(idx);
  };

  public drawNewData = () => {
    renderPaths(this.state, this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  };

  public destroy = () => {
    this.zoomState.destroy();
    this.zoomArea.on("mousemove", null);
    this.zoomArea.remove();
    this.legendController.destroy();
  };
}
