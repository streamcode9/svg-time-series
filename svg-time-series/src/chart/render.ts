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

function createDimensions(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
) {
  const node: SVGSVGElement = svg.node() as SVGSVGElement;
  const div: HTMLElement = node.parentNode as HTMLElement;

  const width = div.clientWidth;
  const height = div.clientHeight;

  svg.attr("width", width);
  svg.attr("height", height);

  const bScreenXVisible = new AR1Basis(0, width);
  const bScreenYVisible = new AR1Basis(height, 0);

  return { width, height, bScreenXVisible, bScreenYVisible };
}

function initPaths(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  hasSf: boolean,
): PathSet {
  const views = svg
    .selectAll("g")
    .data(hasSf ? [0, 1] : [0])
    .enter()
    .append("g")
    .attr("class", "view");
  const nodes = views.nodes() as SVGGElement[];
  const viewNy = nodes[0];
  const viewSf = hasSf ? nodes[1] : undefined;
  const path = views.append("path");
  return { path, viewNy, viewSf };
}

function createScales(
  bScreenXVisible: AR1Basis,
  bScreenYVisible: AR1Basis,
  hasSf: boolean,
): ScaleSet {
  const x: ScaleTime<number, number> = scaleTime().range(
    bScreenXVisible.toArr(),
  );
  const yNy: ScaleLinear<number, number> = scaleLinear().range(
    bScreenYVisible.toArr(),
  );
  let ySf: ScaleLinear<number, number> | undefined;
  if (hasSf) {
    ySf = scaleLinear().range(bScreenYVisible.toArr());
  }
  return { x, yNy, ySf };
}

function createTransforms(
  svgNode: SVGSVGElement,
  paths: PathSet,
): { ny: MyTransform; sf?: MyTransform } {
  const ny = new MyTransform(svgNode, paths.viewNy);
  let sf: MyTransform | undefined;
  if (paths.viewSf) {
    sf = new MyTransform(svgNode, paths.viewSf);
  }
  return { ny, sf };
}

function setupAxes(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  scales: ScaleSet,
  width: number,
  height: number,
): AxisSet {
  const xAxis = new MyAxis(Orientation.Bottom, scales.x)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);

  const yAxis = new MyAxis(Orientation.Right, scales.yNy, scales.ySf)
    .ticks(4, "s")
    .setTickSize(width)
    .setTickPadding(2 - width);

  const gX = bindAxisToDom(svg, xAxis, scales.x);
  const gY = bindAxisToDom(svg, yAxis, scales.yNy, scales.ySf);

  return { x: xAxis, y: yAxis, gX, gY };
}

interface ScaleSet {
  x: ScaleTime<number, number>;
  yNy: ScaleLinear<number, number>;
  ySf?: ScaleLinear<number, number>;
}

interface AxisSet {
  x: MyAxis;
  y: MyAxis;
  gX: Selection<SVGGElement, unknown, any, any>;
  gY: Selection<SVGGElement, unknown, any, any>;
}

interface PathSet {
  path: Selection<SVGPathElement, number, any, unknown>;
  viewNy: SVGGElement;
  viewSf?: SVGGElement;
}

interface TransformSet {
  ny: MyTransform;
  sf?: MyTransform;
  bScreenXVisible: AR1Basis;
}

interface Dimensions {
  width: number;
  height: number;
}

export interface RenderState {
  scales: ScaleSet;
  axes: AxisSet;
  paths: PathSet;
  transforms: TransformSet;
  dimensions: Dimensions;
}

export function setupRender(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  data: ChartData,
): RenderState {
  const hasSf = data.treeSf != null;

  const { width, height, bScreenXVisible, bScreenYVisible } =
    createDimensions(svg);
  const paths = initPaths(svg, hasSf);
  const scales = createScales(bScreenXVisible, bScreenYVisible, hasSf);
  const transformsInner = createTransforms(svg.node() as SVGSVGElement, paths);

  updateScaleX(scales.x, data.bIndexFull, data);
  updateScaleY(
    data.bIndexFull,
    data.treeNy,
    transformsInner.ny,
    scales.yNy,
    data,
  );
  if (hasSf && data.treeSf && transformsInner.sf && scales.ySf) {
    updateScaleY(
      data.bIndexFull,
      data.treeSf,
      transformsInner.sf,
      scales.ySf,
      data,
    );
  }

  const axes = setupAxes(svg, scales, width, height);

  transformsInner.ny.onViewPortResize(bScreenXVisible, bScreenYVisible);
  transformsInner.sf?.onViewPortResize(bScreenXVisible, bScreenYVisible);
  transformsInner.ny.onReferenceViewWindowResize(data.bIndexFull, bPlaceholder);
  transformsInner.sf?.onReferenceViewWindowResize(
    data.bIndexFull,
    bPlaceholder,
  );

  const transforms: TransformSet = {
    ny: transformsInner.ny,
    sf: transformsInner.sf,
    bScreenXVisible,
  };
  const dimensions: Dimensions = { width, height };

  return { scales, axes, paths, transforms, dimensions };
}

export function renderPaths(
  state: RenderState,
  dataArr: Array<[number, number?]>,
) {
  const drawLine = (cityIdx: number) =>
    line<[number, number?]>()
      .defined((d) => {
        return !(isNaN(d[cityIdx]!) || d[cityIdx] == null);
      })
      .x((d, i) => i)
      .y((d) => d[cityIdx]!);

  state.paths.path.attr(
    "d",
    (cityIndex: number) => drawLine(cityIndex)(dataArr) ?? "",
  );
}

export function refreshChart(state: RenderState, data: ChartData) {
  const bIndexVisible = state.transforms.ny.fromScreenToModelBasisX(
    state.transforms.bScreenXVisible,
  );
  updateScaleX(state.scales.x, bIndexVisible, data);
  updateScaleY(
    bIndexVisible,
    data.treeNy,
    state.transforms.ny,
    state.scales.yNy,
    data,
  );
  if (state.transforms.sf && state.scales.ySf && data.treeSf) {
    updateScaleY(
      bIndexVisible,
      data.treeSf,
      state.transforms.sf,
      state.scales.ySf,
      data,
    );
    state.transforms.sf.updateViewNode();
  }
  state.transforms.ny.updateViewNode();
  state.axes.x.axisUp(state.axes.gX);
  state.axes.y.axisUp(state.axes.gY);
}
