import { Selection } from "d3-selection";

import { MyAxis, Orientation } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, bPlaceholder } from "../math/affine.ts";
import type { ChartData } from "./data.ts";
import {
  createDimensions,
  createScales,
  updateScaleX,
  updateScaleY,
  initPaths,
  type ScaleSet,
  type PathSet,
} from "./render/utils.ts";

function setupAxes(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  scales: ScaleSet,
  width: number,
  height: number,
  hasSf: boolean,
  dualYAxis: boolean,
): AxisSet {
  const xAxis = new MyAxis(Orientation.Bottom, scales.x)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);

  xAxis.setScale(scales.x);
  const gX = svg.append("g").attr("class", "axis").call(xAxis.axis.bind(xAxis));

  if (hasSf && dualYAxis && scales.ySf) {
    const yLeft = new MyAxis(Orientation.Left, scales.yNy)
      .ticks(4, "s")
      .setTickSize(width)
      .setTickPadding(2 - width);
    const yRight = new MyAxis(Orientation.Right, scales.ySf)
      .ticks(4, "s")
      .setTickSize(width)
      .setTickPadding(2 - width);

    yLeft.setScale(scales.yNy);
    yRight.setScale(scales.ySf);

    const gY = svg
      .append("g")
      .attr("class", "axis")
      .call(yLeft.axis.bind(yLeft));
    const gYRight = svg
      .append("g")
      .attr("class", "axis")
      .call(yRight.axis.bind(yRight));

    return { x: xAxis, y: yLeft, gX, gY, yRight, gYRight };
  }

  const yAxis = new MyAxis(Orientation.Right, scales.yNy)
    .ticks(4, "s")
    .setTickSize(width)
    .setTickPadding(2 - width);

  yAxis.setScale(scales.yNy);
  const gY = svg.append("g").attr("class", "axis").call(yAxis.axis.bind(yAxis));

  return { x: xAxis, y: yAxis, gX, gY };
}

interface AxisSet {
  x: MyAxis;
  y: MyAxis;
  gX: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  gY: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  yRight?: MyAxis;
  gYRight?: Selection<SVGGElement, unknown, HTMLElement, unknown>;
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
  dualYAxis: boolean;
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
  dualYAxis: boolean,
): RenderState {
  const hasSf = data.treeSf != null;

  const { width, height, bScreenXVisible, bScreenYVisible } =
    createDimensions(svg);
  const paths = initPaths(svg, hasSf);
  const scales = createScales(
    bScreenXVisible,
    bScreenYVisible,
    hasSf && dualYAxis,
  );
  const sharedTransform = new ViewportTransform();
  const transformsInner = {
    ny: sharedTransform,
    sf: hasSf
      ? dualYAxis
        ? new ViewportTransform()
        : sharedTransform
      : undefined,
  };

  updateScaleX(scales.x, data.bIndexFull, data);
  if (hasSf && !dualYAxis && data.treeSf) {
    const bNy = data.bTemperatureVisible(data.bIndexFull, data.treeNy);
    const bSf = data.bTemperatureVisible(data.bIndexFull, data.treeSf);
    const [nyMin, nyMax] = bNy.toArr();
    const [sfMin, sfMax] = bSf.toArr();
    const combined = new AR1Basis(
      Math.min(nyMin, sfMin),
      Math.max(nyMax, sfMax),
    );
    transformsInner.ny.onReferenceViewWindowResize(data.bIndexFull, combined);
    scales.yNy.domain(combined.toArr());
  } else {
    updateScaleY(
      data.bIndexFull,
      data.treeNy,
      transformsInner.ny,
      scales.yNy,
      data,
    );
    if (hasSf && dualYAxis && data.treeSf && transformsInner.sf && scales.ySf) {
      updateScaleY(
        data.bIndexFull,
        data.treeSf,
        transformsInner.sf,
        scales.ySf,
        data,
      );
    }
  }

  const axes = setupAxes(svg, scales, width, height, hasSf, dualYAxis);

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

  return { scales, axes, paths, transforms, dimensions, dualYAxis };
}

export function refreshChart(state: RenderState, data: ChartData) {
  const bIndexVisible = state.transforms.ny.fromScreenToModelBasisX(
    state.transforms.bScreenXVisible,
  );
  updateScaleX(state.scales.x, bIndexVisible, data);
  if (
    state.axes.yRight &&
    state.scales.ySf &&
    state.transforms.sf &&
    data.treeSf
  ) {
    updateScaleY(
      bIndexVisible,
      data.treeNy,
      state.transforms.ny,
      state.scales.yNy,
      data,
    );
    updateScaleY(
      bIndexVisible,
      data.treeSf,
      state.transforms.sf,
      state.scales.ySf,
      data,
    );
    updateNode(state.paths.viewSf!, state.transforms.sf.matrix);
  } else if (data.treeSf) {
    const bNy = data.bTemperatureVisible(bIndexVisible, data.treeNy);
    const bSf = data.bTemperatureVisible(bIndexVisible, data.treeSf);
    const [nyMin, nyMax] = bNy.toArr();
    const [sfMin, sfMax] = bSf.toArr();
    const combined = new AR1Basis(
      Math.min(nyMin, sfMin),
      Math.max(nyMax, sfMax),
    );
    state.transforms.ny.onReferenceViewWindowResize(data.bIndexFull, combined);
    state.transforms.sf?.onReferenceViewWindowResize(data.bIndexFull, combined);
    state.scales.yNy.domain(combined.toArr());
    if (state.paths.viewSf) {
      updateNode(state.paths.viewSf, state.transforms.ny.matrix);
    }
  } else {
    updateScaleY(
      bIndexVisible,
      data.treeNy,
      state.transforms.ny,
      state.scales.yNy,
      data,
    );
  }
  updateNode(state.paths.viewNy, state.transforms.ny.matrix);
  state.axes.x.axisUp(state.axes.gX);
  state.axes.y.axisUp(state.axes.gY);
  state.axes.yRight?.axisUp(state.axes.gYRight!);
}
