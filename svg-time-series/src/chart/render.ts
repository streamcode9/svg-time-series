import { ScaleLinear, ScaleTime, scaleLinear, scaleTime } from "d3-scale";
import { BaseType, Selection, select } from "d3-selection";
import { line } from "d3-shape";

import { MyAxis, Orientation } from "../axis.ts";
import { MyTransform } from "../MyTransform.ts";
import { AR1Basis, bPlaceholder } from "../math/affine.ts";
import { SegmentTree } from "../segmentTree.ts";
import type { ChartData } from "./data.ts";

function bindAxisToDom(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  axis: MyAxis,
  scale1: ScaleLinear<number, number> | ScaleTime<number, number>,
  scale2?: ScaleLinear<number, number> | ScaleTime<number, number>,
) {
  axis.setScale(scale1, scale2);
  return svg.append("g").attr("class", "axis").call(axis.axis.bind(axis));
}

function updateScaleX(
  x: ScaleTime<number, number>,
  bIndexVisible: AR1Basis,
  data: ChartData,
) {
  const bTimeVisible = bIndexVisible.transformWith(data.idxToTime);
  x.domain(bTimeVisible.toArr());
}

function updateScaleY(
  bIndexVisible: AR1Basis,
  tree: SegmentTree,
  pathTransform: MyTransform,
  yScale: ScaleLinear<number, number>,
  data: ChartData,
) {
  const bTemperatureVisible = data.bTemperatureVisible(bIndexVisible, tree);
  pathTransform.onReferenceViewWindowResize(
    data.bIndexFull,
    bTemperatureVisible,
  );
  yScale.domain(bTemperatureVisible.toArr());
}

export interface RenderState {
  x: ScaleTime<number, number>;
  yNy: ScaleLinear<number, number>;
  ySf: ScaleLinear<number, number>;
  pathTransformNy: MyTransform;
  pathTransformSf: MyTransform;
  xAxis: MyAxis;
  yAxis: MyAxis;
  gX: Selection<SVGGElement, unknown, any, any>;
  gY: Selection<SVGGElement, unknown, any, any>;
  path: Selection<SVGPathElement, number, any, unknown>;
  bScreenXVisible: AR1Basis;
  width: number;
  height: number;
  viewNy: SVGGElement;
  viewSf: SVGGElement;
}

export function setupRender(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  data: ChartData,
): RenderState {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;

  const width = div.clientWidth;
  const height = div.clientHeight;

  svg.attr("width", width);
  svg.attr("height", height);

  const views = svg
    .selectAll("g")
    .data([0, 1])
    .enter()
    .append("g")
    .attr("class", "view");
  const [viewNy, viewSf] = views.nodes() as SVGGElement[];

  const path = views.append("path");

  const bScreenXVisible = new AR1Basis(0, width);
  const bScreenYVisible = new AR1Basis(height, 0);

  const x: ScaleTime<number, number> = scaleTime().range(
    bScreenXVisible.toArr(),
  );
  const yNy: ScaleLinear<number, number> = scaleLinear().range(
    bScreenYVisible.toArr(),
  );
  const ySf: ScaleLinear<number, number> = scaleLinear().range(
    bScreenYVisible.toArr(),
  );

  const pathTransformNy = new MyTransform(
    svg.node() as SVGSVGElement,
    viewNy,
  );
  const pathTransformSf = new MyTransform(
    svg.node() as SVGSVGElement,
    viewSf,
  );

  updateScaleX(x, data.bIndexFull, data);
  updateScaleY(data.bIndexFull, data.treeNy, pathTransformNy, yNy, data);
  updateScaleY(data.bIndexFull, data.treeSf, pathTransformSf, ySf, data);

  const xAxis = new MyAxis(Orientation.Bottom, x)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);

  const yAxis = new MyAxis(Orientation.Right, yNy, ySf)
    .ticks(4, "s")
    .setTickSize(width)
    .setTickPadding(2 - width);

  const gX = bindAxisToDom(svg, xAxis, x);
  const gY = bindAxisToDom(svg, yAxis, yNy, ySf);

  pathTransformNy.onViewPortResize(bScreenXVisible, bScreenYVisible);
  pathTransformSf.onViewPortResize(bScreenXVisible, bScreenYVisible);
  pathTransformNy.onReferenceViewWindowResize(data.bIndexFull, bPlaceholder);
  pathTransformSf.onReferenceViewWindowResize(data.bIndexFull, bPlaceholder);

  return {
    x,
    yNy,
    ySf,
    pathTransformNy,
    pathTransformSf,
    xAxis,
    yAxis,
    gX,
    gY,
    path,
    bScreenXVisible,
    width,
    height,
    viewNy,
    viewSf,
  };
}

export function renderPaths(
  state: RenderState,
  dataArr: Array<[number, number]>,
) {
  const drawLine = (cityIdx: number) =>
    line()
      .defined((d: [number, number]) => {
        return !(isNaN(d[cityIdx]) || d[cityIdx] == null);
      })
      .x((d: [number, number], i: number) => i)
      .y((d: [number, number]) => d[cityIdx]);

  state.path.attr("d", (cityIndex: number) =>
    drawLine(cityIndex).call(null, dataArr),
  );
}

export function refreshChart(state: RenderState, data: ChartData) {
  const bIndexVisible = state.pathTransformNy.fromScreenToModelBasisX(
    state.bScreenXVisible,
  );
  updateScaleX(state.x, bIndexVisible, data);
  updateScaleY(
    bIndexVisible,
    data.treeNy,
    state.pathTransformNy,
    state.yNy,
    data,
  );
  updateScaleY(
    bIndexVisible,
    data.treeSf,
    state.pathTransformSf,
    state.ySf,
    data,
  );
  state.pathTransformNy.updateViewNode();
  state.pathTransformSf.updateViewNode();
  state.xAxis.axisUp(state.gX);
  state.yAxis.axisUp(state.gY);
}
