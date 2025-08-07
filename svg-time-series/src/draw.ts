import { Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IMinMax } from "./chart/data.ts";
import { setupRender, refreshChart } from "./chart/render.ts";
import type { RenderState } from "./chart/render.ts";
import { renderPaths } from "./chart/render/utils.ts";
import { LegendController } from "./chart/legend.ts";
import { ZoomState } from "./chart/zoomState.ts";

export type { IMinMax } from "./chart/data.ts";

export interface IPublicInteraction {
  zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  onHover: (x: number) => void;
}

export class TimeSeriesChart {
  private data: ChartData;
  private state: RenderState;
  private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
  private zoomState: ZoomState;
  private legendController: LegendController;

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    legend: Selection<HTMLElement, unknown, HTMLElement, unknown>,
    startTime: number,
    timeStep: number,
    data: Array<[number, number?]>,
    buildSegmentTreeTupleNy: (
      index: number,
      elements: ReadonlyArray<[number, number?]>,
    ) => IMinMax,
    buildSegmentTreeTupleSf?: (
      index: number,
      elements: ReadonlyArray<[number, number?]>,
    ) => IMinMax,
    dualYAxis = false,
    zoomHandler: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    mouseMoveHandler: (event: MouseEvent) => void = () => {},
    formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.data = new ChartData(
      startTime,
      timeStep,
      data,
      buildSegmentTreeTupleNy,
      buildSegmentTreeTupleSf,
    );

    this.state = setupRender(svg, this.data, dualYAxis);

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", this.state.dimensions.width)
      .attr("height", this.state.dimensions.height);
    this.zoomArea.on("mousemove", mouseMoveHandler);

    this.legendController = new LegendController(
      legend,
      this.state,
      this.data,
      formatTime,
    );

    this.zoomState = new ZoomState(
      this.zoomArea,
      this.state,
      () => refreshChart(this.state, this.data),
      (event) => {
        zoomHandler(event);
        this.legendController.refresh();
      },
    );

    this.drawNewData();
    this.onHover(this.state.dimensions.width - 1);
  }

  public get interaction(): IPublicInteraction {
    return { zoom: this.zoom, onHover: this.onHover };
  }

  public updateChartWithNewData(newData: [number, number?]) {
    this.data.append(newData);
    this.drawNewData();
  }

  public dispose() {
    this.zoomState.destroy();
    this.zoomArea.on("mousemove", null);
    this.zoomArea.remove();
    this.legendController.destroy();
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.zoomState.zoom(event, false);
    this.legendController.refresh();
  };

  public onHover = (x: number) => {
    const idx = this.state.transforms.ny.fromScreenToModelX(x);
    this.legendController.onHover(idx);
  };

  private drawNewData = () => {
    renderPaths(this.state, this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  };
}
