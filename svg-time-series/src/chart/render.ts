import { BaseType, Selection } from "d3-selection";

import { MyAxis, Orientation } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, bPlaceholder } from "../math/affine.ts";
import type { ChartData } from "./data.ts";
import { createDimensions } from "./render/dimensions.ts";
import {
  createScales,
  updateScaleX,
  updateScaleY,
  type ScaleSet,
} from "./render/scales.ts";
import { initPaths, createTransforms, type PathSet } from "./render/paths.ts";

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

  xAxis.setScale(scales.x);
  const gX = svg.append("g").attr("class", "axis").call(xAxis.axis.bind(xAxis));
  yAxis.setScale(scales.yNy, scales.ySf);
  const gY = svg.append("g").attr("class", "axis").call(yAxis.axis.bind(yAxis));

  return { x: xAxis, y: yAxis, gX, gY };
}

interface AxisSet {
  x: MyAxis;
  y: MyAxis;
  gX: Selection<SVGGElement, unknown, any, any>;
  gY: Selection<SVGGElement, unknown, any, any>;
}

interface TransformSet {
  ny: ViewportTransform;
  sf?: ViewportTransform;
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
  const transformsInner = createTransforms(paths);

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
    updateNode(state.paths.viewSf!, state.transforms.sf.matrix);
  }
  updateNode(state.paths.viewNy, state.transforms.ny.matrix);
  state.axes.x.axisUp(state.axes.gX);
  state.axes.y.axisUp(state.axes.gY);
}
