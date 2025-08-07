import { Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IMinMax } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import { ChartInteraction } from "./chart/interaction.ts";

export type { IMinMax } from "./chart/data.ts";

export interface IPublicInteraction {
  zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  onHover: (x: number) => void;
}

export class TimeSeriesChart {
  private data: ChartData;
  private _interaction: ChartInteraction;

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

    const renderState = setupRender(svg, this.data, dualYAxis);
    this._interaction = new ChartInteraction(
      svg,
      legend,
      renderState,
      this.data,
      zoomHandler,
      mouseMoveHandler,
      formatTime,
    );

    this._interaction.drawNewData();
    this._interaction.onHover(renderState.dimensions.width - 1);
  }

  public get interaction(): IPublicInteraction {
    return this._interaction;
  }

  public updateChartWithNewData(newData: [number, number?]) {
    this.data.append(newData);
    this._interaction.drawNewData();
  }

  public dispose() {
    this._interaction.destroy();
  }
}
