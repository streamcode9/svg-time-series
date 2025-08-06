import { BaseType, Selection, select } from "d3-selection";
import {
  zoom as d3zoom,
  D3ZoomEvent,
  ZoomTransform,
  ZoomBehavior,
} from "d3-zoom";
import { timeout as runTimeout } from "d3-timer";

import { updateNode } from "../viewZoomTransform.ts";
import type { ChartData } from "./data.ts";
import type { RenderState } from "./render.ts";
import { refreshChart, renderPaths } from "./render.ts";

export function drawProc<T extends unknown[]>(
  f: (...args: T) => void,
): (...args: T) => void {
  let requested = false;

  return (...params: T) => {
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...params);
      });
    }
  };
}

export class ChartInteraction {
  private legendTime: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<BaseType, unknown, HTMLElement, unknown>;

  private zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomArea: Selection<SVGRectElement, unknown, BaseType, unknown>;

  private currentPanZoomTransformState: ZoomTransform | null = null;

  private readonly dotRadius = 3;
  private highlightedGreenDot: SVGCircleElement;
  private highlightedBlueDot: SVGCircleElement | null;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;

  private scheduleRefresh: () => void;
  private schedulePointRefresh: () => void;

  constructor(
    svg: Selection<BaseType, unknown, HTMLElement, unknown>,
    legend: Selection<BaseType, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private data: ChartData,
    zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
    mouseMoveHandler: (event: MouseEvent) => void,
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 40])
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .on("zoom", (event: D3ZoomEvent<Element, unknown>) => {
        zoomHandler(event);
        this.zoom(event);
      });

    this.zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", state.dimensions.width)
      .attr("height", state.dimensions.height)
      .call(this.zoomBehavior);
    this.zoomArea.on("mousemove", mouseMoveHandler);

    const makeDot = (view: SVGGElement) =>
      select(view)
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 1)
        .node() as SVGCircleElement;
    this.highlightedGreenDot = makeDot(state.paths.viewNy);
    this.highlightedBlueDot = state.paths.viewSf
      ? makeDot(state.paths.viewSf)
      : null;

    this.scheduleRefresh = drawProc(() => {
      if (this.currentPanZoomTransformState != null) {
        this.zoomBehavior.transform(
          this.zoomArea,
          this.currentPanZoomTransformState,
        );
      }
      refreshChart(this.state, this.data);
    });

    this.schedulePointRefresh = drawProc(() => {
      this.updateLegendAndDots();
    });
  }

  public zoom = (event: D3ZoomEvent<Element, unknown>) => {
    this.currentPanZoomTransformState = event.transform;
    this.state.transforms.ny.onZoomPan(event.transform);
    this.state.transforms.sf?.onZoomPan(event.transform);
    this.scheduleRefresh();
    this.schedulePointRefresh();
  };

  public onHover = (x: number) => {
    const idx = this.state.transforms.ny.fromScreenToModelX(x);
    this.highlightedDataIdx = Math.min(
      Math.max(idx, 0),
      this.data.data.length - 1,
    );
    this.schedulePointRefresh();
  };

  private updateLegendAndDots() {
    const [greenData, blueData] =
      this.data.data[Math.round(this.highlightedDataIdx)];

    this.legendTime.text(
      new Date(
        this.data.idxToTime.applyToPoint(this.highlightedDataIdx),
      ).toLocaleString(),
    );

    const dotScaleMatrixNy = this.state.transforms.ny.dotScaleMatrix(
      this.dotRadius,
    );
    const dotScaleMatrixSf = this.state.transforms.sf?.dotScaleMatrix(
      this.dotRadius,
    );
    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const updateDot = (
      val: number,
      legendSel: Selection<BaseType, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement | null,
      dotScaleMatrix?: SVGMatrix,
    ) => {
      legendSel.text(fixNaN(val, " "));
      if (node && dotScaleMatrix) {
        updateNode(
          node,
          this.identityMatrix
            .translate(this.highlightedDataIdx, fixNaN(val, 0))
            .multiply(dotScaleMatrix),
        );
      }
    };

    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      dotScaleMatrixNy,
    );
    if (this.state.transforms.sf) {
      updateDot(
        blueData as number,
        this.legendBlue,
        this.highlightedBlueDot,
        dotScaleMatrixSf,
      );
    }
  }

  public drawNewData = () => {
    renderPaths(this.state, this.data.data);
    this.scheduleRefresh();
    this.schedulePointRefresh();
  };

  public destroy = () => {
    this.zoomBehavior.on("zoom", null);
    this.zoomArea.on("mousemove", null);
    this.zoomArea.remove();
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot?.remove();
  };
}

export function setupInteraction(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  legend: Selection<BaseType, unknown, HTMLElement, unknown>,
  state: RenderState,
  data: ChartData,
  zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
  mouseMoveHandler: (event: MouseEvent) => void,
) {
  const interaction = new ChartInteraction(
    svg,
    legend,
    state,
    data,
    zoomHandler,
    mouseMoveHandler,
  );

  return {
    zoom: interaction.zoom,
    onHover: interaction.onHover,
    drawNewData: interaction.drawNewData,
    destroy: interaction.destroy,
  };
}
