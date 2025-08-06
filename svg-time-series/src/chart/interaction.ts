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

export function setupInteraction(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  legend: Selection<BaseType, unknown, HTMLElement, unknown>,
  state: RenderState,
  data: ChartData,
  zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
  mouseMoveHandler: (event: MouseEvent) => void,
) {
  const legendTime = legend.select(".chart-legend__time");
  const legendGreen = legend.select(".chart-legend__green_value");
  const legendBlue = legend.select(".chart-legend__blue_value");

  const zoomBehavior: ZoomBehavior<SVGRectElement, unknown> = d3zoom<
    SVGRectElement,
    unknown
  >()
    .scaleExtent([1, 40])
    .translateExtent([
      [0, 0],
      [state.width, state.height],
    ])
    .on("zoom", (event: D3ZoomEvent<Element, unknown>) => {
      zoomHandler(event);
      zoom(event);
    });

  const zoomArea = svg
    .append("rect")
    .attr("class", "zoom")
    .attr("width", state.width)
    .attr("height", state.height)
    .call(zoomBehavior);
  zoomArea.on("mousemove", mouseMoveHandler);

  let currentPanZoomTransformState: ZoomTransform | null = null;
  const dotRadius = 3;
  const makeDot = (view: SVGGElement) =>
    select(view)
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 1)
      .node() as SVGCircleElement;
  const highlightedGreenDot = makeDot(state.viewNy);
  const highlightedBlueDot = state.viewSf ? makeDot(state.viewSf) : null;

  const identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  let highlightedDataIdx = 0;

  const scheduleRefresh = drawProc(() => {
    if (currentPanZoomTransformState != null) {
      zoomBehavior.transform(zoomArea, currentPanZoomTransformState);
    }
    refreshChart(state, data);
  });

  const schedulePointRefresh = drawProc(() => {
    updateLegendAndDots();
  });

  function zoom(event: D3ZoomEvent<Element, unknown>) {
    currentPanZoomTransformState = event.transform;
    state.pathTransformNy.onZoomPan(event.transform);
    state.pathTransformSf?.onZoomPan(event.transform);
    scheduleRefresh();
    schedulePointRefresh();
  }

  function onHover(x: number) {
    const idx = state.pathTransformNy.fromScreenToModelX(x);
    highlightedDataIdx = Math.min(Math.max(idx, 0), data.data.length - 1);
    schedulePointRefresh();
  }

  function updateLegendAndDots() {
    const [greenData, blueData] = data.data[Math.round(highlightedDataIdx)];

    legendTime.text(
      new Date(
        data.idxToTime.applyToPoint(highlightedDataIdx),
      ).toLocaleString(),
    );

    const dotScaleMatrixNy = state.pathTransformNy.dotScaleMatrix(dotRadius);
    const dotScaleMatrixSf = state.pathTransformSf?.dotScaleMatrix(dotRadius);
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
          identityMatrix
            .translate(highlightedDataIdx, fixNaN(val, 0))
            .multiply(dotScaleMatrix),
        );
      }
    };

    updateDot(greenData, legendGreen, highlightedGreenDot, dotScaleMatrixNy);
    if (state.pathTransformSf) {
      updateDot(
        blueData as number,
        legendBlue,
        highlightedBlueDot,
        dotScaleMatrixSf,
      );
    }
  }

  function drawNewData() {
    renderPaths(state, data.data);
    scheduleRefresh();
    schedulePointRefresh();
  }

  return { zoom, onHover, drawNewData };
}
