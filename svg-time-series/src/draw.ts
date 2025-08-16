import type { Selection } from "d3-selection";
import type { D3ZoomEvent } from "d3-zoom";
import { zoomIdentity } from "d3-zoom";
import { brush, type BrushBehavior, type D3BrushEvent } from "d3-brush";

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
  enableBrush: () => void;
  disableBrush: () => void;
  getSelectedTimeWindow: () => [number, number] | null;
}

export class TimeSeriesChart {
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
  private data: ChartData;
  private state: RenderState;
  private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>;
  private zoomState: ZoomState;
  private legendController: ILegendController;
  private brushLayer: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  private brushBehavior: BrushBehavior<unknown>;
  private selectedTimeWindow: [number, number] | null = null;

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
      .attr("class", "zoom-overlay cursor-grab")
      .attr("width", this.state.dimensions.width)
      .attr("height", this.state.dimensions.height)
      .attr("fill", "none")
      .style("pointer-events", "all");

    this.brushBehavior = brush()
      .extent([
        [0, 0],
        [this.state.dimensions.width, this.state.dimensions.height],
      ])
      .on("end", this.onBrushEnd);

    this.brushLayer = svg
      .append("g")
      .attr("class", "brush-layer")
      .style("display", "none")
      .call(this.brushBehavior);

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

    this.zoomArea
      .on("mousemove", mouseMoveHandler)
      .on("mouseleave", () => {
        this.legendController.clearHighlight();
      })
      .on("pointerdown.zoomCursor", () => {
        this.zoomArea
          .classed("cursor-grab", false)
          .classed("cursor-grabbing", true);
      })
      .on("pointerup.zoomCursor pointerleave.zoomCursor", () => {
        this.zoomArea
          .classed("cursor-grabbing", false)
          .classed("cursor-grab", true);
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

    this.refreshAll();
    this.onHover(this.state.dimensions.width - 1);
  }

  public get interaction(): IPublicInteraction {
    return {
      zoom: this.zoom,
      onHover: this.onHover,
      resetZoom: this.resetZoom,
      setScaleExtent: this.setScaleExtent,
      enableBrush: this.enableBrush,
      disableBrush: this.disableBrush,
      getSelectedTimeWindow: this.getSelectedTimeWindow,
    };
  }

  public updateChartWithNewData(...values: number[]): void {
    this.data.append(...values);
    this.refreshAll();
  }

  public dispose() {
    this.zoomState.destroy();
    this.zoomArea
      .on("mousemove", null)
      .on("mouseleave", null)
      .on(".zoomCursor", null);
    this.state.destroy();
    this.zoomArea.remove();
    this.legendController.destroy();
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

  public enableBrush = () => {
    this.brushLayer.style("display", null);
  };

  public disableBrush = () => {
    this.brushLayer.style("display", "none");
    this.clearBrush();
    this.selectedTimeWindow = null;
  };

  public getSelectedTimeWindow = (): [number, number] | null => {
    return this.selectedTimeWindow;
  };

  public resize = (dimensions: { width: number; height: number }) => {
    const { width, height } = dimensions;
    this.svg.attr("width", width).attr("height", height);
    this.state.resize(dimensions, this.zoomState);
    this.state.refresh(this.data);
    this.brushBehavior.extent([
      [0, 0],
      [width, height],
    ]);
    this.brushLayer.call(this.brushBehavior);
    this.refreshAll();
  };

  public onHover = (x: number) => {
    let idx = Math.round(this.state.xTransform.fromScreenToModelX(x));
    idx = this.data.clampIndex(idx);
    this.legendController.highlightIndex(idx);
  };

  private refreshAll(): void {
    this.state.seriesRenderer.draw(this.data.data);
    this.zoomState.refresh();
    this.legendController.refresh();
  }

  private onBrushEnd = (event: D3BrushEvent<unknown>) => {
    if (!event.selection) {
      return;
    }
    let [[x0], [x1]] = event.selection as [[number, number], [number, number]];
    if (x0 === x1) {
      this.clearBrush();
      return;
    }
    if (x1 < x0) {
      [x0, x1] = [x1, x0];
    }
    const m0 = this.data.clampIndex(
      this.state.xTransform.fromScreenToModelX(x0),
    );
    const m1 = this.data.clampIndex(
      this.state.xTransform.fromScreenToModelX(x1),
    );
    const sx0 = this.state.xTransform.toScreenFromModelX(m0);
    const sx1 = this.state.xTransform.toScreenFromModelX(m1);
    const k = this.state.dimensions.width / (sx1 - sx0);
    const t = zoomIdentity.scale(k).translate(-sx0, 0);
    this.zoomState.zoomBehavior.transform(this.zoomArea, t);
    const startIdx = this.data.startIndex;
    const t0 = this.data.startTime + (startIdx + m0) * this.data.timeStep;
    const t1 = this.data.startTime + (startIdx + m1) * this.data.timeStep;
    this.selectedTimeWindow = [t0, t1];
    this.clearBrush();
  };

  private clearBrush = () => {
    (
      this.brushBehavior as unknown as {
        move: (
          selection: Selection<SVGGElement, unknown, HTMLElement, unknown>,
          value: null,
        ) => void;
      }
    ).move(this.brushLayer, null);
  };
}
