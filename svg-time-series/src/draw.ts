import type { Selection } from "d3-selection";
import type { D3ZoomEvent, ZoomTransform } from "d3-zoom";
import { zoomIdentity, zoomTransform } from "d3-zoom";
import { brushX, type BrushBehavior, type D3BrushEvent } from "d3-brush";
import { dispatch as d3dispatch } from "d3-dispatch";
import { clearBrushSelection } from "./draw/brushUtils.ts";
import { handleBrushEnd } from "./draw/brushController.ts";

import { ChartData } from "./chart/data.ts";
import type { IDataSource } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import type { RenderState } from "./chart/render.ts";
import type { ILegendController } from "./chart/legend.ts";
import { ZoomState } from "./chart/zoomState.ts";
import type { IZoomStateOptions } from "./chart/zoomState.ts";
import { assertFiniteOrNaN } from "./chart/validation.ts";

export type { IDataSource } from "./chart/data.ts";
export type { IMinMax } from "./chart/axisData.ts";
export type { ILegendController } from "./chart/legend.ts";
export type { IZoomStateOptions } from "./chart/zoomState.ts";

export type ChartEvent =
  | "beforeRender"
  | "afterRender"
  | "beforeZoom"
  | "afterZoom"
  | "brushEnd"
  | "dataUpdate";
export type ChartEventHandler = (payload: unknown) => void;

export interface IPublicInteraction {
  zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  onHover: (x: number) => void;
  resetZoom: () => void;
  setScaleExtent: (extent: [number, number]) => void;
  enableBrush: () => void;
  disableBrush: () => void;
  zoomToTimeWindow: (start: Date | number, end: Date | number) => boolean;
  getSelectedTimeWindow: () => [number, number] | null;
  getZoomTransform: () => ZoomTransform;
  dispose: () => void;
  on: (
    eventName: ChartEvent | `${ChartEvent}.${string}`,
    handler: ChartEventHandler,
  ) => void;
  off: (eventName: ChartEvent | `${ChartEvent}.${string}`) => void;
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
  private zoomHandler: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  private zoomOptions: IZoomStateOptions | undefined;
  private readonly publicInteraction: IPublicInteraction;
  private readonly dispatch = d3dispatch<object, Record<ChartEvent, unknown[]>>(
    "beforeRender",
    "afterRender",
    "beforeZoom",
    "afterZoom",
    "brushEnd",
    "dataUpdate",
  );

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
    const { width, height } = this.state.getDimensions();

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom-overlay cursor-grab")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .style("pointer-events", "all");

    this.brushBehavior = brushX()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("end", this.onBrushEnd);

    this.brushLayer = svg
      .append("g")
      .attr("class", "brush-layer")
      .style("display", "none")
      .call(this.brushBehavior);

    this.legendController = legendController;
    this.zoomHandler = zoomHandler;
    this.zoomOptions = zoomOptions;

    const context = this.state.createLegendContext(this.data);
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

    this.zoomState = this.initializeZoomState();

    this.refreshAll();
    this.onHover(width - 1);

    this.publicInteraction = {
      zoom: this.zoom,
      onHover: this.onHover,
      resetZoom: this.resetZoom,
      setScaleExtent: this.setScaleExtent,
      enableBrush: this.enableBrush,
      disableBrush: this.disableBrush,
      zoomToTimeWindow: this.zoomToTimeWindow,
      getSelectedTimeWindow: this.getSelectedTimeWindow,
      getZoomTransform: this.getZoomTransform,
      dispose: this.dispose,
      on: this.on,
      off: this.off,
    };
  }

  public get interaction(): IPublicInteraction {
    return this.publicInteraction;
  }

  public updateChartWithNewData(values: number[]): void {
    if (values.length !== this.data.seriesCount) {
      throw new Error(
        `TimeSeriesChart.updateChartWithNewData expected ${String(
          this.data.seriesCount,
        )} values, received ${String(values.length)}`,
      );
    }
    for (let i = 0; i < values.length; i++) {
      assertFiniteOrNaN(values[i], `values[${String(i)}]`);
    }
    this.data.append(...values);
    this.refreshAll();
    this.dispatch.call("dataUpdate", this, values);
  }

  public resetData(source: IDataSource): void {
    this.data.replace(source);
    this.state.destroy();
    this.state = setupRender(this.svg, this.data);
    const svgNode = this.svg.node();
    if (svgNode) {
      svgNode.appendChild(this.zoomArea.node()!);
      svgNode.appendChild(this.brushLayer.node()!);
    }
    const context = this.state.createLegendContext(this.data);
    this.legendController.init(context);
    this.zoomState.destroy();
    this.zoomState = this.initializeZoomState();
    this.refreshAll();
    const { width } = this.state.getDimensions();
    this.onHover(width - 1);
    this.dispatch.call("dataUpdate", this, undefined);
  }

  public dispose = () => {
    (
      [
        "beforeRender",
        "afterRender",
        "beforeZoom",
        "afterZoom",
        "brushEnd",
        "dataUpdate",
      ] as ChartEvent[]
    ).forEach((e) => this.dispatch.on(e, null));
    this.zoomState.destroy();
    this.zoomArea
      .on("mousemove", null)
      .on("mouseleave", null)
      .on(".zoomCursor", null);
    this.brushBehavior.on("end", null);
    this.brushLayer.on(".brush", null).remove();
    this.state.destroy();
    this.zoomArea.remove();
    this.legendController.destroy();
  };

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.dispatch.call("beforeZoom", this, event);
    this.zoomState.zoom(event);
  };

  public on = (
    eventName: ChartEvent | `${ChartEvent}.${string}`,
    handler: ChartEventHandler,
  ): void => {
    this.dispatch.on(eventName, handler);
  };

  public off = (eventName: ChartEvent | `${ChartEvent}.${string}`): void => {
    this.dispatch.on(eventName, null);
  };

  public resetZoom = () => {
    this.zoomState.reset();
  };

  public setScaleExtent = (extent: [number, number]) => {
    this.zoomState.setScaleExtent(extent);
  };

  public enableBrush = () => {
    this.clearBrush();
    this.brushLayer.style("display", null);
  };

  public disableBrush = () => {
    this.brushLayer.style("display", "none");
    this.clearBrush();
  };

  public zoomToTimeWindow = (
    start: Date | number,
    end: Date | number,
  ): boolean => {
    const startDate = typeof start === "number" ? new Date(start) : start;
    const endDate = typeof end === "number" ? new Date(end) : end;
    let m0 = this.data.timeToIndex(startDate);
    let m1 = this.data.timeToIndex(endDate);
    m0 = this.data.clampIndex(m0);
    m1 = this.data.clampIndex(m1);
    if (m1 < m0) {
      [m0, m1] = [m1, m0];
    }
    const sx0 = this.state.axes.x.scale(m0);
    const sx1 = this.state.axes.x.scale(m1);
    if (m0 === m1 || sx0 === sx1) {
      this.selectedTimeWindow = null;
      return false;
    }
    const { width } = this.state.getDimensions();
    const k = width / (sx1 - sx0);
    const t = zoomIdentity.scale(k).translate(-sx0, 0);
    this.zoomState.zoomBehavior.transform(this.zoomArea, t);
    const t0 = +this.data.indexToTime(m0);
    const t1 = +this.data.indexToTime(m1);
    this.selectedTimeWindow = [t0, t1];
    return true;
  };

  public getSelectedTimeWindow = (): [number, number] | null => {
    return this.selectedTimeWindow
      ? ([...this.selectedTimeWindow] as [number, number])
      : null;
  };

  public getZoomTransform = (): ZoomTransform => {
    return zoomTransform(this.zoomArea.node()!);
  };

  public resize = (dimensions: { width: number; height: number }) => {
    const { width, height } = dimensions;
    this.svg.attr("width", width).attr("height", height);
    this.state.resize(dimensions, this.zoomArea);
    this.zoomState.updateExtents(dimensions);
    this.brushBehavior.extent([
      [0, 0],
      [width, height],
    ]);
    this.brushLayer.call(this.brushBehavior);
    this.zoomState.refresh();
  };

  public onHover = (x: number) => {
    let idx = Math.round(this.state.screenToModelX(x));
    idx = this.data.clampIndex(idx);
    const legend = this.legendController;
    if (!Number.isFinite(idx)) {
      legend.clearHighlight();
      return;
    }
    if (legend.highlightIndexRaf) {
      legend.highlightIndexRaf(idx);
    } else {
      legend.highlightIndex(idx);
    }
  };

  private refreshAll(): void {
    this.dispatch.call("beforeRender", this);
    this.state.seriesRenderer.draw(this.data.data);
    this.zoomState.refresh();
    this.dispatch.call("afterRender", this);
  }

  private initializeZoomState(): ZoomState {
    const zoomState = new ZoomState(
      this.zoomArea,
      this.state,
      () => {
        this.dispatch.call("beforeRender", this);
        const t = zoomTransform(this.zoomArea.node()!);
        this.state.refresh(this.data, t);
        this.legendController.refresh();
        this.dispatch.call("afterRender", this);
      },
      (e) => {
        this.zoomHandler(e);
        this.dispatch.call("afterZoom", this, e);
      },
      this.zoomOptions,
    );
    const zoomBehavior = (
      zoomState as unknown as {
        zoomBehavior?: { on?: (type: string, cb: unknown) => unknown };
      }
    ).zoomBehavior;
    if (typeof zoomBehavior?.on === "function") {
      zoomBehavior.on("zoom", (e: D3ZoomEvent<SVGRectElement, unknown>) => {
        this.dispatch.call("beforeZoom", this, e);
        zoomState.zoom(e);
      });
    }
    return zoomState;
  }

  private onBrushEnd = (event: D3BrushEvent<unknown>) => {
    // Ignore programmatic brush clears to avoid infinite recursion
    if (!event.sourceEvent) return;

    const timeWindow = handleBrushEnd(
      event,
      this.data,
      this.state,
      this.zoomState,
      this.zoomArea,
    );
    clearBrushSelection(this.brushBehavior, this.brushLayer);
    this.selectedTimeWindow = timeWindow;
    this.dispatch.call("brushEnd", this, timeWindow);
  };

  private clearBrush = () => {
    clearBrushSelection(this.brushBehavior, this.brushLayer);
    this.selectedTimeWindow = null;
  };
}
