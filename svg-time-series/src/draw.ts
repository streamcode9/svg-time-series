import type { Selection } from "d3-selection";
import type { D3ZoomEvent } from "d3-zoom";

import { ChartData } from "./chart/data.ts";
import type { IDataSource } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import type { RenderState } from "./chart/render.ts";
import type { ILegendController, LegendContext } from "./chart/legend.ts";
import { ZoomState } from "./chart/zoomState.ts";
import type { IZoomStateOptions } from "./chart/zoomState.ts";

export type { IMinMax, IDataSource } from "./chart/data.ts";
export type { ILegendController } from "./chart/legend.ts";
export type { IZoomStateOptions } from "./chart/zoomState.ts";

export interface IPublicInteraction {
  zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  onHover: (x: number) => void;
  resetZoom: () => void;
  setScaleExtent: (extent: [number, number]) => void;
}

export class TimeSeriesChart {
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
  private data: ChartData;
  private state: RenderState;
  private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
  private zoomState: ZoomState;
  private legendController: ILegendController;

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    data: IDataSource,
    legendController: ILegendController,
    zoomHandler: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    mouseMoveHandler: (event: MouseEvent) => void = () => {},
    zoomOptions?: IZoomStateOptions,
  ) {
    this.svg = svg;
    this.data = new ChartData(data);

    this.state = setupRender(svg, this.data);

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", this.state.dimensions.width)
      .attr("height", this.state.dimensions.height);

    this.legendController = legendController;

    const context: LegendContext = {
      getPoint: (idx) => this.data.getPoint(idx),
      length: this.data.length,
      series: this.state.series.map((s) => ({
        path: s.path,
        transform: this.state.axes.y[s.axisIdx]!.transform,
      })),
    };
    this.legendController.init(context);

    this.zoomArea.on("mousemove", mouseMoveHandler).on("mouseleave", () => {
      this.legendController.clearHighlight();
    });

    this.zoomState = new ZoomState(
      this.zoomArea,
      this.state,
      () => {
        this.state.refresh(this.data);
      },
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
      setScaleExtent: this.setScaleExtent,
    };
  }

  public updateChartWithNewData(...values: number[]): void {
    this.data.append(...values);
    this.drawNewData();
  }

  public dispose() {
    this.zoomState.destroy();
    this.zoomArea.on("mousemove", null).on("mouseleave", null);
    this.zoomArea.remove();
    this.legendController.destroy();
    this.state.destroy();
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.zoomState.zoom(event);
  };

  public resetZoom = () => {
    this.zoomState.reset();
  };

  public setScaleExtent = (extent: [number, number]) => {
    this.zoomState.setScaleExtent(extent);
  };

  public resize = (dimensions: { width: number; height: number }) => {
    const { width, height } = dimensions;
    this.svg.attr("width", width).attr("height", height);
    this.state.resize(dimensions, this.zoomState);
    this.state.refresh(this.data);
    this.refreshAll();
  };

  public onHover = (x: number) => {
    let idx = this.state.axes.y[0]!.transform.fromScreenToModelX(x);
    idx = this.data.clampIndex(idx);
    this.legendController.highlightIndex(idx);
  };

  private drawNewData = () => {
    this.refreshAll();
  };

  private refreshAll = () => {
    this.state.seriesRenderer.draw(this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  };
}
