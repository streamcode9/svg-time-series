import type { Selection } from "d3-selection";
import { scaleTime } from "d3-scale";
import type { ScaleTime, ScaleLinear } from "d3-scale";
import type { Line } from "d3-shape";
import { zoomIdentity, type ZoomTransform } from "d3-zoom";

import { MyAxis, Orientation } from "../axis.ts";
import { updateNode } from "../utils/domNodeTransform.ts";

import { ViewportTransform } from "../ViewportTransform.ts";
import { AxisManager } from "./axisManager.ts";
import type { AxisModel, AxisRenderState } from "./axisManager.ts";
import type { ChartData } from "./data.ts";
import { createDimensions } from "./render/utils.ts";
import { SeriesRenderer } from "./seriesRenderer.ts";
import { createSeries } from "./series.ts";
import type { LegendContext, LegendSeriesInfo } from "./legend.ts";

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
  g?: Selection<SVGGElement, unknown, HTMLElement, unknown> | undefined;
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
  lastMatrix?: DOMMatrix;
}

function matricesEqual(a: DOMMatrix, b: DOMMatrix): boolean {
  return (
    a.a === b.a &&
    a.b === b.b &&
    a.c === b.c &&
    a.d === b.d &&
    a.e === b.e &&
    a.f === b.f
  );
}

export class RenderState {
  public axisManager: AxisManager;
  public axes: Axes;
  public axisRenders: AxisRenderState[];
  public xTransform: ViewportTransform;
  public dimensions: Dimensions;
  public series: Series[];
  public seriesRenderer: SeriesRenderer;
  private xDomain: [number | Date, number | Date];
  private xRange: [number, number];
  private yDomains: [number | Date, number | Date][];
  private yRanges: [number, number][];

  constructor(
    axisManager: AxisManager,
    axes: Axes,
    axisRenders: AxisRenderState[],
    xTransform: ViewportTransform,
    dimensions: Dimensions,
    series: Series[],
    seriesRenderer: SeriesRenderer,
  ) {
    this.axisManager = axisManager;
    this.axes = axes;
    this.axisRenders = axisRenders;
    this.xTransform = xTransform;
    this.dimensions = dimensions;
    this.series = series;
    this.seriesRenderer = seriesRenderer;
    this.xDomain = axes.x.scale.domain().slice() as [
      number | Date,
      number | Date,
    ];
    this.xRange = axes.x.scale.range().slice() as [number, number];
    this.yDomains = axes.y.map(
      (a) => a.scale.domain().slice() as [number | Date, number | Date],
    );
    this.yRanges = axes.y.map(
      (a) => a.scale.range().slice() as [number, number],
    );
  }

  private updateAxisIfChanged(
    render: AxisRenderState,
    model: AxisModel,
    idx: number,
  ): void {
    const domain = model.scale.domain() as [number | Date, number | Date];
    const range = model.scale.range() as [number, number];
    const prevDomain =
      idx === -1
        ? this.xDomain
        : (this.yDomains[idx] as [number | Date, number | Date]);
    const prevRange =
      idx === -1 ? this.xRange : (this.yRanges[idx] as [number, number]);
    if (
      +domain[0] !== +prevDomain[0] ||
      +domain[1] !== +prevDomain[1] ||
      range[0] !== prevRange[0] ||
      range[1] !== prevRange[1]
    ) {
      render.axis.setScale(model.scale);
      render.axis.axisUp(render.g);
      if (idx === -1) {
        this.xDomain = domain.slice() as [number | Date, number | Date];
        this.xRange = range.slice() as [number, number];
      } else {
        this.yDomains[idx] = domain.slice() as [number | Date, number | Date];
        this.yRanges[idx] = range.slice() as [number, number];
      }
    }
  }

  public refresh(data: ChartData, transform: ZoomTransform): void {
    this.xTransform.onReferenceViewWindowResize(data.bIndexFull, [0, 1]);

    this.axisManager.setData(data);
    this.axisManager.updateScales(transform);

    for (const s of this.series) {
      const t = this.axes.y[s.axisIdx]!.transform;
      const m = t.matrix;
      if (!s.lastMatrix || !matricesEqual(m, s.lastMatrix)) {
        updateNode(s.view, m);
        s.lastMatrix = m;
      }
    }
    this.axes.x.scale = this.axisManager.x;
    const axisX = this.axes.x;
    this.updateAxisIfChanged(
      axisX as unknown as AxisRenderState,
      { scale: axisX.scale } as unknown as AxisModel,
      -1,
    );
    this.axisRenders.forEach((r, i) => {
      const model = this.axisManager.axes[i]!;
      this.updateAxisIfChanged(r, model, i);
    });
  }

  public destroy(): void {
    for (const s of this.series) {
      s.path.remove();
      s.view.remove();
    }
    this.series.length = 0;

    const axisX = this.axes.x;
    if (axisX.g) {
      axisX.g.remove();
      axisX.g = undefined;
    }

    for (const r of this.axisRenders) {
      r.g.remove();
    }
    this.axisRenders.length = 0;
    this.axes.y.length = 0;
  }

  public resize(
    dimensions: Dimensions,
    zoomOverlay: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
  ): void {
    const { width, height } = dimensions;

    this.dimensions.width = width;
    this.dimensions.height = height;
    zoomOverlay.attr("width", width).attr("height", height);

    this.axes.x.scale.range([0, width]);
    this.axes.x.axis.setScale(this.axes.x.scale);
    this.axisManager.setXAxis(this.axes.x.scale);

    const xRange = this.axes.x.scale.range() as [number, number];
    for (const a of this.axes.y) {
      a.scale.range([height, 0]);
    }
    const yRange = this.axes.y[0]!.scale.range() as [number, number];
    this.xTransform.onViewPortResize(xRange, yRange);
    for (const a of this.axes.y) {
      a.transform.onViewPortResize(xRange, a.scale.range() as [number, number]);
    }
  }

  public applyZoomTransform(transform: ZoomTransform): void {
    this.xTransform.onZoomPan(transform);
    this.axes.y.forEach((a) => a.transform.onZoomPan(transform));
  }

  public setDimensions(dimensions: Dimensions): void {
    this.dimensions.width = dimensions.width;
    this.dimensions.height = dimensions.height;
  }

  public getDimensions(): Dimensions {
    return { ...this.dimensions };
  }

  public getLegendSeriesInfo(): readonly LegendSeriesInfo[] {
    return this.series.map((s) => ({
      path: s.path,
      transform: this.axes.y[s.axisIdx]!.transform,
    }));
  }

  public screenToModelX(x: number): number {
    return this.xTransform.fromScreenToModelX(x);
  }

  public createLegendContext(data: ChartData): LegendContext {
    return {
      getPoint: (idx) => data.getPoint(idx),
      getLength: () => data.length,
      series: this.getLegendSeriesInfo(),
    };
  }
}

export function setupRender(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  data: ChartData,
): RenderState {
  const { width, height } = createDimensions(svg);
  const maxAxisIdx = data.seriesAxes.reduce(
    (max, idx) => Math.max(max, idx),
    0,
  );
  const axisCount = maxAxisIdx + 1;

  const axisManager = new AxisManager(axisCount, data);
  axisManager.setXAxis(scaleTime().range([0, width]));
  const yAxes = axisManager.axes;
  for (const a of yAxes) {
    a.scale.range([height, 0]);
  }
  axisManager.updateScales(zoomIdentity);
  const xRange = axisManager.x.range() as [number, number];
  const yRange = yAxes[0]!.scale.range() as [number, number];
  for (const a of yAxes) {
    a.transform.onViewPortResize(xRange, a.scale.range() as [number, number]);
    a.transform.onReferenceViewWindowResize(
      data.bIndexFull,
      a.scale.domain() as [number, number],
    );
  }
  const xTransform = new ViewportTransform();
  xTransform.onViewPortResize(xRange, yRange);
  xTransform.onReferenceViewWindowResize(data.bIndexFull, [0, 1]);

  const series = createSeries(svg, data.seriesAxes);
  const seriesRenderer = new SeriesRenderer();
  seriesRenderer.series = series;
  const xAxis = new MyAxis(Orientation.Bottom, axisManager.x)
    .ticks(4)
    .setTickSize(height)
    .setTickPadding(8 - height);
  xAxis.setScale(axisManager.x);
  const xAxisGroup = svg.append("g").attr("class", "axis");
  xAxisGroup.call(xAxis.axis.bind(xAxis));

  // Build render state for each Y axis separately from the model.
  const axisRenders: AxisRenderState[] = yAxes.map((a, i) => {
    const orientation = i === 0 ? Orientation.Right : Orientation.Left;
    const axis = createYAxis(orientation, a.scale, width);
    const g = svg.append("g").attr("class", "axis");
    g.call(axis.axis.bind(axis));
    return { axis, g };
  });

  const axes: Axes = {
    x: { axis: xAxis, g: xAxisGroup, scale: axisManager.x },
    y: yAxes,
  };
  const dimensions: Dimensions = { width, height };
  return new RenderState(
    axisManager,
    axes,
    axisRenders,
    xTransform,
    dimensions,
    series,
    seriesRenderer,
  );
}
