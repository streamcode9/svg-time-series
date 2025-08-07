import { Selection } from "d3-selection";

import { MyAxis, Orientation } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, DirectProductBasis, bPlaceholder } from "../math/affine.ts";
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
  const series = [
    {
      tree: data.treeNy,
      transform: transformsInner.ny,
      scale: scales.yNy,
    },
  ];
  if (hasSf && dualYAxis && data.treeSf && transformsInner.sf && scales.ySf) {
    series.push({
      tree: data.treeSf,
      transform: transformsInner.sf,
      scale: scales.ySf,
    });
  }

  if (series.length === 1 && hasSf && data.treeSf) {
    const { combined, dp } = data.combinedTemperatureDp(data.bIndexFull);
    for (const s of series) {
      s.transform.onReferenceViewWindowResize(dp);
      s.scale.domain(combined.toArr());
    }
  } else {
    for (const s of series) {
      updateScaleY(data.bIndexFull, s.tree, s.transform, s.scale, data);
    }
  }

  const axes = setupAxes(svg, scales, width, height, hasSf, dualYAxis);

  const bScreenVisibleDp = DirectProductBasis.fromProjections(
    bScreenXVisible,
    bScreenYVisible,
  );
  transformsInner.ny.onViewPortResize(bScreenVisibleDp);
  transformsInner.sf?.onViewPortResize(bScreenVisibleDp);
  transformsInner.ny.onReferenceViewWindowResize(
    DirectProductBasis.fromProjections(data.bIndexFull, bPlaceholder),
  );
  transformsInner.sf?.onReferenceViewWindowResize(
    DirectProductBasis.fromProjections(data.bIndexFull, bPlaceholder),
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

  const series = [
    {
      tree: data.treeNy,
      transform: state.transforms.ny,
      scale: state.scales.yNy,
      view: state.paths.viewNy,
      axis: state.axes.y,
      gAxis: state.axes.gY,
    },
  ];

  if (
    state.axes.yRight &&
    state.scales.ySf &&
    state.transforms.sf &&
    data.treeSf &&
    state.paths.viewSf &&
    state.axes.gYRight
  ) {
    series.push({
      tree: data.treeSf,
      transform: state.transforms.sf,
      scale: state.scales.ySf,
      view: state.paths.viewSf,
      axis: state.axes.yRight,
      gAxis: state.axes.gYRight!,
    });
  }

  if (series.length === 1 && data.treeSf) {
    const { combined, dp } = data.combinedTemperatureDp(bIndexVisible);
    for (const s of series) {
      s.transform.onReferenceViewWindowResize(dp);
      s.scale.domain(combined.toArr());
    }
    if (state.paths.viewSf) {
      updateNode(state.paths.viewSf, state.transforms.ny.matrix);
    }
  } else {
    for (const s of series) {
      updateScaleY(bIndexVisible, s.tree, s.transform, s.scale, data);
    }
  }

  for (const s of series) {
    updateNode(s.view, s.transform.matrix);
    s.axis.axisUp(s.gAxis);
  }
  state.axes.x.axisUp(state.axes.gX);
}
