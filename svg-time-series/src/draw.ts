import { Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IDataSource } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import type { RenderState } from "./chart/render.ts";
import { AR1Basis, DirectProductBasis } from "./math/affine.ts";
import type { ILegendController, LegendContext } from "./chart/legend.ts";
import { ZoomState, IZoomStateOptions } from "./chart/zoomState.ts";

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
        transform: this.state.axes.y[s.axisIdx].transform,
      })),
    };
    this.legendController.init(context);

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

    for (const s of this.state.series) {
      s.path.remove();
      s.view.remove();
    }
    this.state.series.length = 0;
    const axisX = this.state.axes.x;
    axisX.g.remove();
    (axisX as unknown as { g?: typeof axisX.g }).g = undefined;

    for (const r of this.state.axisRenders) {
      r.g.remove();
    }
    this.state.axisRenders.length = 0;
    this.state.axes.y.length = 0;
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

    const bScreenXVisible = new AR1Basis(0, width);
    const bScreenYVisible = new AR1Basis(height, 0);
    const bScreenVisible = DirectProductBasis.fromProjections(
      bScreenXVisible,
      bScreenYVisible,
    );

    this.state.bScreenXVisible = bScreenXVisible;

    this.state.dimensions.width = width;
    this.state.dimensions.height = height;

    this.zoomArea.attr("width", width).attr("height", height);
    this.zoomState.updateExtents({ width, height });

    for (const a of this.state.axes.y) {
      a.transform.onViewPortResize(bScreenVisible);
    }

    this.state.refresh(this.data);
    this.state.seriesRenderer.draw(this.data.data);
    this.legendController.refresh();
  };

  public onHover = (x: number) => {
    let idx = this.state.axes.y[0].transform.fromScreenToModelX(x);
    idx = Math.min(Math.max(idx, 0), this.data.length - 1);
    this.legendController.highlightIndex(idx);
  };

  private drawNewData = () => {
    this.state.seriesRenderer.draw(this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  };
}
