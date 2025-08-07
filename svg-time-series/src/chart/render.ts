import { Selection } from "d3-selection";
import type { ScaleLinear } from "d3-scale";

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
  type TransformPair,
} from "./render/utils.ts";

function createYAxis(
  orientation: Orientation,
  scale: ScaleLinear<number, number>,
  width: number,
): MyAxis {
  const axis = new MyAxis(orientation, scale)
    .ticks(4, "s")
    .setTickSize(width)
    .setTickPadding(2 - width);

  axis.setScale(scale);
  return axis;
}

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
    const yLeft = createYAxis(Orientation.Left, scales.yNy, width);
    const yRight = createYAxis(Orientation.Right, scales.ySf, width);

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

  const yAxis = createYAxis(Orientation.Right, scales.yNy, width);
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

export interface Series {
  tree: ChartData["treeNy"];
  transform: ViewportTransform;
  scale: ScaleLinear<number, number>;
  view: SVGGElement;
  axis?: MyAxis;
  gAxis?: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

export function buildSeries(
  data: ChartData,
  transforms: TransformPair,
  scales: ScaleSet,
  paths: PathSet,
  axes?: AxisSet,
  dualYAxis = false,
): Series[] {
  const hasSf = data.treeSf != null;
  const series: Series[] = [
    {
      tree: data.treeNy,
      transform: transforms.ny,
      scale: scales.yNy,
      view: paths.viewNy,
      axis: axes?.y,
      gAxis: axes?.gY,
    },
  ];

  if (
    hasSf &&
    dualYAxis &&
    data.treeSf &&
    transforms.sf &&
    scales.ySf &&
    paths.viewSf
  ) {
    series.push({
      tree: data.treeSf,
      transform: transforms.sf,
      scale: scales.ySf,
      view: paths.viewSf,
      axis: axes?.yRight,
      gAxis: axes?.gYRight,
    });
  }

  return series;
}

export interface RenderState {
  scales: ScaleSet;
  axes: AxisSet;
  paths: PathSet;
  transforms: TransformSet;
  dimensions: Dimensions;
  dualYAxis: boolean;
  series: Series[];
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
  const transformsInner: TransformPair = {
    ny: sharedTransform,
    sf: hasSf
      ? dualYAxis
        ? new ViewportTransform()
        : sharedTransform
      : undefined,
  };

  updateScaleX(scales.x, data.bIndexFull, data);
  const series = buildSeries(
    data,
    transformsInner,
    scales,
    paths,
    undefined,
    dualYAxis,
  );

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

  // Attach axes to series after scales have been initialized
  series[0].axis = axes.y;
  series[0].gAxis = axes.gY;
  if (series.length > 1) {
    series[1].axis = axes.yRight;
    series[1].gAxis = axes.gYRight;
  }

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

  return { scales, axes, paths, transforms, dimensions, dualYAxis, series };
}

export function refreshChart(state: RenderState, data: ChartData) {
  const bIndexVisible = state.transforms.ny.fromScreenToModelBasisX(
    state.transforms.bScreenXVisible,
  );
  updateScaleX(state.scales.x, bIndexVisible, data);
  const series = state.series;

  // Update tree references in case data has changed
  series[0].tree = data.treeNy;
  if (series[1] && data.treeSf) {
    series[1].tree = data.treeSf;
  }

  if (state.series.length === 1 && data.treeSf) {
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
    s.axis!.axisUp(s.gAxis!);
  }
  state.axes.x.axisUp(state.axes.gX);
}
