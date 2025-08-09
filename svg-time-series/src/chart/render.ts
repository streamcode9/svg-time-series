import { Selection } from "d3-selection";
import {
  scaleLinear,
  scaleTime,
  type ScaleLinear,
  type ScaleTime,
} from "d3-scale";
import type { Line } from "d3-shape";

import { MyAxis, Orientation } from "../axis.ts";
import { ViewportTransform } from "../ViewportTransform.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, DirectProductBasis, bPlaceholder } from "../math/affine.ts";
import type { ChartData, IMinMax } from "./data.ts";
import { SegmentTree } from "segment-tree-rmq";
import {
  createDimensions,
  updateScaleX,
  initSeriesNode,
  createLine,
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
  xScale: ScaleTime<number, number>,
  axes: AxisState[],
  width: number,
  height: number,
  hasSf: boolean,
  dualYAxis: boolean,
): AxisDataX {
  const xAxis = new MyAxis(Orientation.Bottom, xScale)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);

  xAxis.setScale(xScale);
  const gX = svg.append("g").attr("class", "axis").call(xAxis.axis.bind(xAxis));

  axes[0].g = svg
    .append("g")
    .attr("class", "axis")
    .call(
      (axes[0].axis = createYAxis(
        Orientation.Right,
        axes[0].scale,
        width,
      )).axis.bind(axes[0].axis),
    );

  if (hasSf && dualYAxis && axes[1]) {
    axes[1].g = svg
      .append("g")
      .attr("class", "axis")
      .call(
        (axes[1].axis = createYAxis(
          Orientation.Left,
          axes[1].scale,
          width,
        )).axis.bind(axes[1].axis),
      );
  }

  return { axis: xAxis, g: gX, scale: xScale };
}

interface AxisData {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

interface AxisDataX extends AxisData {
  scale: ScaleTime<number, number>;
}

interface Axes {
  x: AxisDataX;
  y: AxisState[];
}

interface Dimensions {
  width: number;
  height: number;
}

interface AxisState {
  transform: ViewportTransform;
  scale: ScaleLinear<number, number>;
  tree: SegmentTree<IMinMax>;
  axis?: MyAxis;
  g?: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

export interface Series {
  axisIdx: number;
  view?: SVGGElement;
  path?: SVGPathElement;
  line: Line<number[]>;
}

export interface RenderState {
  axes: Axes;
  bScreenXVisible: AR1Basis;
  dimensions: Dimensions;
  dualYAxis: boolean;
  series: Series[];
  refresh: (data: ChartData) => void;
}

function updateYScales(axes: AxisState[], bIndex: AR1Basis, data: ChartData) {
  const domains = new Map<
    ScaleLinear<number, number>,
    { min: number; max: number; transform: ViewportTransform }
  >();

  const axisIndices = data.seriesAxes.includes(1) ? [0, 1] : [0];
  axisIndices.forEach((i) => {
    const tree = data.buildAxisTree(i);
    if (i < axes.length) {
      axes[i].tree = tree;
    }
    const a = axes[Math.min(i, axes.length - 1)];
    const dp = data.updateScaleY(bIndex, tree);
    const [min, max] = dp.y().toArr();
    const entry = domains.get(a.scale);
    if (entry) {
      entry.min = Math.min(entry.min, min);
      entry.max = Math.max(entry.max, max);
    } else {
      domains.set(a.scale, { min, max, transform: a.transform });
    }
  });

  domains.forEach(({ min, max, transform }, scale) => {
    const b = new AR1Basis(min, max);
    const dp = DirectProductBasis.fromProjections(data.bIndexFull, b);
    transform.onReferenceViewWindowResize(dp);
    scale.domain([min, max]);
  });
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
  dualYAxis: boolean,
): RenderState {
  const hasSf = data.seriesAxes.includes(1);

  const seriesCount = data.seriesCount;

  const bScreenVisibleDp = createDimensions(svg);
  const bScreenXVisible = bScreenVisibleDp.x();
  const width = bScreenXVisible.getRange();
  const height = bScreenVisibleDp.y().getRange();
  const axisCount = hasSf && dualYAxis ? 2 : 1;

  const [xRange, yRange] = bScreenVisibleDp.toArr();
  const xScale: ScaleTime<number, number> = scaleTime().range(xRange);
  updateScaleX(xScale, data.bIndexFull, data);

  const axesY: AxisState[] = Array.from({ length: axisCount }, (_, i) => ({
    transform: new ViewportTransform(),
    scale: scaleLinear<number, number>().range(yRange),
    tree: data.buildAxisTree(i),
  }));

  updateYScales(axesY, data.bIndexFull, data);

  const xAxisData = setupAxes(
    svg,
    xScale,
    axesY,
    width,
    height,
    hasSf,
    dualYAxis,
  );

  const refDp = DirectProductBasis.fromProjections(
    data.bIndexFull,
    bPlaceholder,
  );
  for (const a of axesY) {
    a.transform.onViewPortResize(bScreenVisibleDp);
    a.transform.onReferenceViewWindowResize(refDp);
  }

  const series: Series[] = [];
  for (let i = 0; i < seriesCount; i++) {
    const { view, path } = initSeriesNode(svg);
    const axisIdx = data.seriesAxes[i] ?? 0;
    series.push({ axisIdx, view, path, line: createLine(i) });
  }

  const axes: Axes = { x: xAxisData, y: axesY };
  const dimensions: Dimensions = { width, height };

  const state: RenderState = {
    axes,
    bScreenXVisible,
    dimensions,
    dualYAxis,
    series,
    refresh(this: RenderState, data: ChartData) {
      const bIndexVisible = this.axes.y[0].transform.fromScreenToModelBasisX(
        this.bScreenXVisible,
      );
      updateScaleX(this.axes.x.scale, bIndexVisible, data);

      updateYScales(this.axes.y, bIndexVisible, data);

      for (const s of this.series) {
        if (s.view) {
          const t =
            this.axes.y[s.axisIdx]?.transform ?? this.axes.y[0].transform;
          updateNode(s.view, t.matrix);
        }
      }
      for (const a of this.axes.y) {
        if (a.axis && a.g) {
          a.axis.axisUp(a.g);
        }
      }
      this.axes.x.axis.axisUp(this.axes.x.g);
    },
  };

  return state;
}
