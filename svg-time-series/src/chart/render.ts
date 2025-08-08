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
  updateScaleY,
  initPaths,
  lineNy,
  lineSf,
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
  transforms: TransformPair,
  scales: ScaleSet,
  paths: PathSet,
  hasSf: boolean,
  axes?: AxisSet,
  dualYAxis = false,
): Series[] {
  const nodes = paths.path.nodes() as SVGPathElement[];
  const series: Series[] = [
    {
      tree: data.treeAxis0,
      transform: transforms.ny,
      scale: scales.yNy,
      view: paths.viewNy,
      path: nodes[0],
      axis: axes?.y,
      gAxis: axes?.gY,
      line: lineNy,
    },
  ];

  if (hasSf && data.treeAxis1 && nodes[1]) {
    series.push({
      tree: data.treeAxis1,
      transform: dualYAxis && transforms.sf ? transforms.sf : transforms.ny,
      scale: dualYAxis && scales.ySf ? scales.ySf : scales.yNy,
      view: paths.viewSf,
      path: nodes[1],
      axis: axes?.yRight ?? axes?.y,
      gAxis: axes?.gYRight ?? axes?.gY,
      line: lineSf,
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
  refresh: (data: ChartData) => void;
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
  dualYAxis: boolean,
): RenderState {
  const hasSf = data.treeAxis1 != null;

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
    sf: hasSf && dualYAxis ? new ViewportTransform() : sharedTransform,
  };

  updateScaleX(scales.x, data.bIndexFull, data);
  const series = buildSeries(
    data,
    transformsInner,
    scales,
    paths,
    hasSf,
    undefined,
    dualYAxis,
  );

  if (
    series.length > 1 &&
    series[0].scale === series[1].scale &&
    data.treeAxis1
  ) {
    const { combined, dp } = data.combinedAxisDp(data.bIndexFull);
    for (const s of series) {
      s.transform.onReferenceViewWindowResize(dp);
      s.scale.domain(combined.toArr());
    }
  } else {
    for (const s of series) {
      if (s.tree) {
        updateScaleY(data.bIndexFull, s.tree, s.transform, s.scale, data);
      }
    }
  }

  const axes = setupAxes(svg, scales, width, height, hasSf, dualYAxis);

  // Attach axes to series after scales have been initialized
  const axisArr = [axes.y];
  const gAxisArr = [axes.gY];
  if (series.length > 1) {
    axisArr.push(axes.yRight ?? axes.y);
    gAxisArr.push(axes.gYRight ?? axes.gY);
  }
  series.forEach((s, i) => {
    s.axis = axisArr[i];
    s.gAxis = gAxisArr[i];
  });

  const bScreenVisibleDp = DirectProductBasis.fromProjections(
    bScreenXVisible,
    bScreenYVisible,
  );
  transformsInner.ny.onViewPortResize(bScreenVisibleDp);
  transformsInner.sf?.onViewPortResize(bScreenVisibleDp);
  const refDp = DirectProductBasis.fromProjections(
    data.bIndexFull,
    bPlaceholder,
  );
  transformsInner.ny.onReferenceViewWindowResize(refDp);
  transformsInner.sf?.onReferenceViewWindowResize(refDp);

  const transforms: TransformSet = {
    ny: transformsInner.ny,
    sf: transformsInner.sf,
    bScreenXVisible,
  };
  const dimensions: Dimensions = { width, height };

  const state: RenderState = {
    scales,
    axes,
    paths,
    transforms,
    dimensions,
    dualYAxis,
    series,
    refresh(this: RenderState, data: ChartData) {
      const bIndexVisible = this.transforms.ny.fromScreenToModelBasisX(
        this.transforms.bScreenXVisible,
      );
      updateScaleX(this.scales.x, bIndexVisible, data);
      const series = this.series;

      // Update tree references in case data has changed
      series[0].tree = data.treeAxis0;
      if (series.length > 1) {
        series[1].tree = data.treeAxis1;
      }

      if (
        series.length > 1 &&
        series[0].scale === series[1].scale &&
        data.treeAxis1
      ) {
        const { combined, dp } = data.combinedAxisDp(bIndexVisible);
        for (const s of series) {
          s.transform.onReferenceViewWindowResize(dp);
          s.scale.domain(combined.toArr());
        }
      } else {
        for (const s of series) {
          if (s.tree) {
            updateScaleY(bIndexVisible, s.tree, s.transform, s.scale, data);
          }
        }
      }

      for (const s of series) {
        if (s.view) {
          updateNode(s.view, s.transform.matrix);
        }
        if (s.axis && s.gAxis) {
          s.axis.axisUp(s.gAxis);
        }
      }
      this.axes.x.axisUp(this.axes.gX);
    },
  };

  return state;
}
