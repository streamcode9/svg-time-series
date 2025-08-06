import { BaseType, Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IMinMax } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import { setupInteraction } from "./chart/interaction.ts";

export type { IMinMax } from "./chart/data.ts";

export class TimeSeriesChart {
  public zoom: (event: D3ZoomEvent<Element, unknown>) => void;
  public onHover: (x: number) => void;
  private drawNewData: () => void;
  private data: ChartData;

  constructor(
    svg: Selection<BaseType, unknown, HTMLElement, unknown>,
    legend: Selection<BaseType, unknown, HTMLElement, unknown>,
    startTime: number,
    timeStep: number,
    data: Array<[number, number]>,
    buildSegmentTreeTupleNy: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
    buildSegmentTreeTupleSf: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
    zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
    mouseMoveHandler: (event: MouseEvent) => void,
  ) {
    this.data = new ChartData(
      startTime,
      timeStep,
      data,
      buildSegmentTreeTupleNy,
      buildSegmentTreeTupleSf,
    );

    const renderState = setupRender(svg, this.data);
    const { zoom, onHover, drawNewData } = setupInteraction(
      svg,
      legend,
      renderState,
      this.data,
      zoomHandler,
      mouseMoveHandler,
    );

    this.zoom = zoom;
    this.onHover = onHover;
    this.drawNewData = drawNewData;

    this.drawNewData();
    this.onHover(renderState.width);
  }

  public updateChartWithNewData(newData: [number, number]) {
    this.data.append(newData);
    this.drawNewData();
  }
}
