import { Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IMinMax, IDataSource } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import type { RenderState } from "./chart/render.ts";
import { renderPaths } from "./chart/render/utils.ts";
import type { ILegendController } from "./chart/legend.ts";
import { ZoomState, IZoomStateOptions } from "./chart/zoomState.ts";

export type { IMinMax, IDataSource } from "./chart/data.ts";
export type { ILegendController } from "./chart/legend.ts";
export type { IZoomStateOptions } from "./chart/zoomState.ts";

export interface IPublicInteraction {
  zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  onHover: (x: number) => void;
  resetZoom: () => void;
}

export class TimeSeriesChart {
  private data: ChartData;
  private state: RenderState;
  private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
  private zoomState: ZoomState;
  private legendController: ILegendController;

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    data: IDataSource,
    legendControllerFactory: (
      state: RenderState,
      data: ChartData,
    ) => ILegendController,
    dualYAxis = false,
    zoomHandler: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    mouseMoveHandler: (event: MouseEvent) => void = () => {},
    zoomOptions: IZoomStateOptions = {},
  ) {
    this.data = new ChartData(data);

    this.state = setupRender(svg, this.data, dualYAxis);

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", this.state.dimensions.width)
      .attr("height", this.state.dimensions.height);

    this.legendController = legendControllerFactory(this.state, this.data);

    this.zoomArea
      .on("mousemove", mouseMoveHandler)
      .on("mouseleave", () => this.legendController.clearHighlight());

    this.zoomState = new ZoomState(
      this.zoomArea,
      this.state,
      () => this.state.refresh(this.data),
      (event) => {
        zoomHandler(event);
        this.legendController.refresh();
      },
      zoomOptions,
    );

    this.drawNewData();
    this.onHover(this.state.dimensions.width - 1);
  }

  public get interaction(): IPublicInteraction {
    return {
      zoom: this.zoom,
      onHover: this.onHover,
      resetZoom: this.resetZoom,
    };
  }

  public updateChartWithNewData(ny: number, sf?: number): void {
    this.data.append(ny, sf);
    this.drawNewData();
  }

  public dispose() {
    this.zoomState.destroy();
    this.zoomArea.on("mousemove", null).on("mouseleave", null);
    this.zoomArea.remove();
    this.legendController.destroy();
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.zoomState.zoom(event);
  };

  public resetZoom = () => {
    this.zoomState.reset();
  };

  public resize = (dimensions: { width: number; height: number }) => {
    this.state.dimensions.width = dimensions.width;
    this.state.dimensions.height = dimensions.height;
    this.zoomArea
      .attr("width", dimensions.width)
      .attr("height", dimensions.height);
    this.zoomState.updateExtents(dimensions);
  };

  public onHover = (x: number) => {
    const idx = this.state.transforms.ny.fromScreenToModelX(x);
    this.legendController.highlightIndex(idx);
  };

  private drawNewData = () => {
    renderPaths(this.state, this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  };
}
