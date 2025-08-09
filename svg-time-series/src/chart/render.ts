import { Selection } from "d3-selection";
import type { ScaleLinear } from "d3-scale";
import type { Line } from "d3-shape";

import { MyAxis, Orientation } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, DirectProductBasis, bPlaceholder } from "../math/affine.ts";
import type { ChartData, IMinMax } from "./data.ts";
import type { SegmentTree } from "segment-tree-rmq";
import {
  createDimensions,
  createScales,
  updateScaleX,
  initPaths,
  createLine,
  type ScaleSet,
  type PathSet,
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

  const yRight = createYAxis(Orientation.Right, scales.y[0], width);
  const gYRight = svg
    .append("g")
    .attr("class", "axis")
    .call(yRight.axis.bind(yRight));

  const yAxes: AxisData[] = [{ axis: yRight, g: gYRight }];

  if (hasSf && dualYAxis && scales.y[1]) {
    const yLeft = createYAxis(Orientation.Left, scales.y[1], width);
    const gYLeft = svg
      .append("g")
      .attr("class", "axis")
      .call(yLeft.axis.bind(yLeft));

    yAxes.push({ axis: yLeft, g: gYLeft });
  }

  return { x: { axis: xAxis, g: gX }, y: yAxes };
}

interface AxisData {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

interface AxisSet {
  x: AxisData;
  y: AxisData[];
}

interface Dimensions {
  width: number;
  height: number;
}

export interface Series {
  tree?: SegmentTree<IMinMax>;
  transform: ViewportTransform;
  scale: ScaleLinear<number, number>;
  view?: SVGGElement;
  path?: SVGPathElement;
  axis?: MyAxis;
  gAxis?: Selection<SVGGElement, unknown, HTMLElement, unknown>;
  line: Line<number[]>;
}

export function buildSeries(
  data: ChartData,
  transforms: ViewportTransform[],
  scales: ScaleSet,
  paths: PathSet,
  axes?: AxisSet,
): Series[] {
  const pathNodes = paths.path.nodes() as SVGPathElement[];
  const views = paths.nodes;
  const series: Series[] = [];

  for (let i = 0; i < data.seriesCount; i++) {
    const path = pathNodes[i];
    const view = views[i];
    if (!path || !view) continue;

    const axisIdx = data.seriesAxes[i] ?? 0;
    const tree = data.getTree(axisIdx);
    if (!tree) continue;

    const transform = transforms[axisIdx] ?? transforms[0];
    const scale = scales.y[axisIdx] ?? scales.y[0];
    const axisData = axes?.y?.[axisIdx] ?? axes?.y?.[0];

    series.push({
      tree,
      transform,
      scale,
      view,
      path,
      axis: axisData?.axis,
      gAxis: axisData?.g,
      line: createLine(i),
    });
  }

  return series;
}

export interface RenderState {
  scales: ScaleSet;
  axes: AxisSet;
  paths: PathSet;
  transforms: ViewportTransform[];
  bScreenXVisible: AR1Basis;
  dimensions: Dimensions;
  dualYAxis: boolean;
  series: Series[];
  refresh: (data: ChartData) => void;
}

function updateYScales(series: Series[], bIndex: AR1Basis, data: ChartData) {
  if (
    series.length > 1 &&
    series[0].scale === series[1].scale &&
    data.treeAxis1
  ) {
    const { combined, dp } = data.combinedAxisDp(bIndex);
    for (const s of series) {
      s.transform.onReferenceViewWindowResize(dp);
      s.scale.domain(combined.toArr());
    }
  } else {
    for (const s of series) {
      if (s.tree) {
        const dp = data.updateScaleY(bIndex, s.tree);
        s.transform.onReferenceViewWindowResize(dp);
        s.scale.domain(dp.y().toArr());
      }
    }
  }
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
  dualYAxis: boolean,
): RenderState {
  const hasSf = data.treeAxis1 != null;

  const seriesCount = data.seriesCount;

  const bScreenVisibleDp = createDimensions(svg);
  const bScreenXVisible = bScreenVisibleDp.x();
  const bScreenYVisible = bScreenVisibleDp.y();
  const width = bScreenXVisible.getRange();
  const height = bScreenYVisible.getRange();
  const paths = initPaths(svg, seriesCount);
  const axisCount = hasSf && dualYAxis ? 2 : 1;
  const scales = createScales(bScreenVisibleDp, axisCount);
  const transformsInner = Array.from(
    { length: axisCount },
    () => new ViewportTransform(),
  );

  updateScaleX(scales.x, data.bIndexFull, data);
  const series = buildSeries(data, transformsInner, scales, paths);

  updateYScales(series, data.bIndexFull, data);

  const axes = setupAxes(svg, scales, width, height, hasSf, dualYAxis);

  // Attach axes to series after scales have been initialized
  series.forEach((s, i) => {
    const axisData = axes.y[i] ?? axes.y[0];
    s.axis = axisData.axis;
    s.gAxis = axisData.g;
  });

  const refDp = DirectProductBasis.fromProjections(
    data.bIndexFull,
    bPlaceholder,
  );
  for (const t of transformsInner) {
    t.onViewPortResize(bScreenVisibleDp);
    t.onReferenceViewWindowResize(refDp);
  }

  const dimensions: Dimensions = { width, height };

  const state: RenderState = {
    scales,
    axes,
    paths,
    transforms: transformsInner,
    bScreenXVisible,
    dimensions,
    dualYAxis,
    series,
    refresh(this: RenderState, data: ChartData) {
      const bIndexVisible = this.transforms[0].fromScreenToModelBasisX(
        this.bScreenXVisible,
      );
      updateScaleX(this.scales.x, bIndexVisible, data);
      const series = this.series;

      // Update tree references in case data has changed
      series[0].tree = data.treeAxis0;
      if (series.length > 1) {
        series[1].tree = data.treeAxis1;
      }

      updateYScales(series, bIndexVisible, data);

      for (const s of series) {
        if (s.view) {
          updateNode(s.view, s.transform.matrix);
        }
        if (s.axis && s.gAxis) {
          s.axis.axisUp(s.gAxis);
        }
      }
      this.axes.x.axis.axisUp(this.axes.x.g);
    },
  };

  return state;
}
