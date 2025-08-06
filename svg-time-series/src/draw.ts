import { Selection } from "d3-selection";
import { D3ZoomEvent } from "d3-zoom";

import { ChartData, IMinMax } from "./chart/data.ts";
import { setupRender } from "./chart/render.ts";
import { ChartInteraction } from "./chart/interaction.ts";

export type { IMinMax } from "./chart/data.ts";

export class TimeSeriesChart {
  public zoom: (event: D3ZoomEvent<SVGRectElement, unknown>) => void;
  public onHover: (x: number) => void;
  private drawNewData: () => void;
  private data: ChartData;
  private destroyInteraction: () => void;

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
    const interaction = new ChartInteraction(
      svg,
      legend,
      renderState,
      this.data,
      zoomHandler,
      mouseMoveHandler,
      formatTime,
    );

    this.zoom = interaction.zoom;
    this.onHover = interaction.onHover;
    this.drawNewData = interaction.drawNewData;
    this.destroyInteraction = interaction.destroy;

    this.drawNewData();
    this.onHover(renderState.dimensions.width - 1);
  }

  public updateChartWithNewData(newData: [number, number?]) {
    this.data.append(newData);
    this.drawNewData();
  }

  public dispose() {
    this.destroyInteraction();
  }
}
