import { Selection } from "d3-selection";
import { scaleTime, type ScaleTime, type ScaleLinear } from "d3-scale";
import type { Line } from "d3-shape";

import { MyAxis, Orientation } from "../axis.ts";
import {
  AxisManager,
  type AxisModel,
  type AxisRenderState,
} from "./axisManager.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import { AR1Basis, DirectProductBasis, bPlaceholder } from "../math/affine.ts";
import type { ChartData } from "./data.ts";
import { createDimensions, updateScaleX } from "./render/utils.ts";
import { SeriesRenderer } from "./seriesRenderer.ts";
import { SeriesManager } from "./series.ts";

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

interface AxisData {
  axis: MyAxis;
  g: Selection<SVGGElement, unknown, HTMLElement, unknown>;
}

interface AxisDataX extends AxisData {
  scale: ScaleTime<number, number>;
}

interface Axes {
  x: AxisDataX;
  y: AxisModel[];
}

interface Dimensions {
  width: number;
  height: number;
}

export interface Series {
  axisIdx: number;
  view: SVGGElement;
  path: SVGPathElement;
  line: Line<number[]>;
}

export interface RenderState {
  axisManager: AxisManager;
  axes: Axes;
  axisRenders: AxisRenderState[];
  bScreenXVisible: AR1Basis;
  dimensions: Dimensions;
  series: Series[];
  seriesRenderer: SeriesRenderer;
  refresh: (data: ChartData) => void;
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
  dualYAxis: boolean,
): RenderState {
  const bScreenVisibleDp = createDimensions(svg);
  const bScreenXVisible = bScreenVisibleDp.x();
  const width = bScreenXVisible.getRange();
  const height = bScreenVisibleDp.y().getRange();
  const axisCount = dualYAxis && data.seriesAxes.includes(1) ? 2 : 1;

  const [xRange, yRange] = bScreenVisibleDp.toArr();
  const xScale: ScaleTime<number, number> = scaleTime().range(xRange);
  updateScaleX(xScale, data.bIndexFull, data);

  const axisManager = new AxisManager();
  const axesY = axisManager.create(axisCount);
  for (const a of axesY) {
    a.scale.range(yRange);
  }
  axisManager.updateScales(data.bIndexFull, data);

  const refDp = DirectProductBasis.fromProjections(
    data.bIndexFull,
    bPlaceholder,
  );
  for (const a of axesY) {
    a.transform.onViewPortResize(bScreenVisibleDp);
    a.transform.onReferenceViewWindowResize(refDp);
  }

  const seriesManager = new SeriesManager(svg, data.seriesAxes);
  const seriesRenderer = new SeriesRenderer();
  seriesRenderer.series = seriesManager.series;
  const { series } = seriesManager;
  const xAxis = new MyAxis(Orientation.Bottom, xScale)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);
  xAxis.setScale(xScale);
  const gX = svg.append("g").attr("class", "axis");
  gX.call(xAxis.axis.bind(xAxis));

  // Build render state for each Y axis separately from the model.
  const axisRenders: AxisRenderState[] = axesY.map((a, i) => {
    const orientation = i === 0 ? Orientation.Right : Orientation.Left;
    const axis = createYAxis(orientation, a.scale, width);
    const g = svg.append("g").attr("class", "axis");
    g.call(axis.axis.bind(axis));
    return { axis, g };
  });

  const axes: Axes = { x: { axis: xAxis, g: gX, scale: xScale }, y: axesY };
  const dimensions: Dimensions = { width, height };

  const state: RenderState = {
    axisManager,
    axes,
    axisRenders,
    bScreenXVisible,
    dimensions,
    series,
    seriesRenderer,
    refresh(this: RenderState, data: ChartData) {
      const bIndexVisible = this.axes.y[0].transform.fromScreenToModelBasisX(
        this.bScreenXVisible,
      );
      updateScaleX(this.axes.x.scale, bIndexVisible, data);

      this.axisManager.updateScales(bIndexVisible, data);

      for (const s of this.series) {
        const t = this.axes.y[s.axisIdx]?.transform ?? this.axes.y[0].transform;
        updateNode(s.view, t.matrix);
      }
      this.axisRenders.forEach((r) => r.axis.axisUp(r.g));
      this.axes.x.axis.axisUp(this.axes.x.g);
    },
  };

  return state;
}
