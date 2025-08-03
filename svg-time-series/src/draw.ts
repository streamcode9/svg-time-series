import { ScaleLinear, scaleLinear, ScaleTime, scaleTime } from "d3-scale";
import { BaseType, select, Selection } from "d3-selection";
import { line } from "d3-shape";
import { timeout as runTimeout } from "d3-timer";
import { zoom as d3zoom, ZoomTransform, D3ZoomEvent } from "d3-zoom";

import { MyAxis, Orientation } from "./axis.ts";
import { MyTransform } from "./MyTransform.ts";
import { updateNode } from "./viewZoomTransform.ts";
import { IMinMax, SegmentTree } from "./segmentTree.ts";
import {
  AR1,
  AR1Basis,
  betweenTBasesAR1,
  bPlaceholder,
  bUnit,
} from "./math/affine.ts";

export type { IMinMax };

function drawProc<T extends unknown[]>(f: (...args: T) => void): (...args: T) => void {
  let requested = false;

  return (...params: T) => {
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...params);
      });
    }
  };
}

function bindAxisToDom(
  svg: Selection<BaseType, unknown, HTMLElement, unknown>,
  axis: MyAxis,
  scale1: ScaleLinear<number, number> | ScaleTime<number, number>,
  scale2?: ScaleLinear<number, number> | ScaleTime<number, number>,
) {
  axis.setScale(scale1, scale2);
  return svg.append("g").attr("class", "axis").call(axis.axis.bind(axis));
}

export class TimeSeriesChart {
  public zoom: (event: D3ZoomEvent<Element, unknown>) => void;
  public onHover: (x: number) => void;
  private drawNewData: () => void;
  private data: Array<[number, number]>;

  // updated when a new point is added
  private treeNy: SegmentTree;
  private treeSf: SegmentTree;

  // Updated when a new point is added
  // used to convert indices to dates shown by X axis
  // Date.now() style timestamp
  private timeAtIdx0: number;

  // Step by X axis
  // Date.now() style timestamp delta
  private timeStep: number;

  // Affine transformation mapping index space to time space
  private idxToTime: AR1;

  // Shift within index space applied when a point is appended
  private idxShift: AR1;

  // Basis spanning the full index range
  private bIndexFull: AR1Basis;

  private buildSegmentTreeTupleNy: (
    index: number,
    elements: ReadonlyArray<[number, number]>,
  ) => IMinMax;
  private buildSegmentTreeTupleSf: (
    index: number,
    elements: ReadonlyArray<[number, number]>,
  ) => IMinMax;
  private zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void;
  private mouseMoveHandler: (event: MouseEvent) => void;

  private legendTime: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<BaseType, unknown, HTMLElement, unknown>;

  private highlightedDataIdx: number;

  constructor(
    svg: Selection<BaseType, unknown, HTMLElement, unknown>,
    legend: Selection<BaseType, unknown, HTMLElement, unknown>,
    startTime: number,
    timeStep: number,
    data: Array<[number, number]>,
    buildSegmentTreeTupleNy: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
    buildSegmentTreeTupleSf: (
      index: number,
      elements: ReadonlyArray<[number, number]>,
    ) => IMinMax,
    zoomHandler: (event: D3ZoomEvent<Element, unknown>) => void,
    mouseMoveHandler: (event: MouseEvent) => void,
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    // The second basis is defined by a point and a vector.
    // Equivalent to new AR1(startTime, timeStep) but avoids coordinate thinking.
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(startTime, startTime + timeStep),
    );

    // When a new point is added, elements 1 and 2 shift to positions 0 and 1
    this.idxShift = betweenTBasesAR1(new AR1Basis(1, 2), bUnit);
    this.buildSegmentTreeTupleNy = buildSegmentTreeTupleNy;
    this.buildSegmentTreeTupleSf = buildSegmentTreeTupleSf;
    this.zoomHandler = zoomHandler;
    this.mouseMoveHandler = mouseMoveHandler;
    this.bIndexFull = new AR1Basis(0, data.length - 1);
    this.drawChart(svg, data);
  }

  public updateChartWithNewData(newData: [number, number]) {
    this.data.push(newData);
    this.data.shift();

    this.idxToTime = this.idxToTime.composeWith(this.idxShift);

    this.drawNewData();
  }

  private drawChart(
    svg: Selection<BaseType, unknown, HTMLElement, unknown>,
    data: Array<[number, number]>,
  ) {
    this.data = data;

    const node: SVGSVGElement = svg.node() as SVGSVGElement;
    const div: HTMLElement = node.parentNode as HTMLElement;

    const width = div.clientWidth;
    const height = div.clientHeight;

    svg.attr("width", width);
    svg.attr("height", height);

    // Verbose way to append two <g> elements
    // .enter() is D3's update helper; we handle updates manually
    const views = svg
      .selectAll("g")
      .data([0, 1])
      .enter()
      .append("g")
      .attr("class", "view");
    const [viewNy, viewSf] = views.nodes() as SVGGElement[];

    const path = views.append("path");

    // The viewport is treated as a separate space.
    // Y is inverted, so its basis is flipped relative to X.
    const bScreenXVisible = new AR1Basis(0, width);
    const bScreenYVisible = new AR1Basis(height, 0);

    // Interface to legacy code; the verbosity is acceptable
    const x: ScaleTime<number, number> = scaleTime().range(
      bScreenXVisible.toArr(),
    );
    const yNy: ScaleLinear<number, number> = scaleLinear().range(
      bScreenYVisible.toArr(),
    );
    const ySf: ScaleLinear<number, number> = scaleLinear().range(
      bScreenYVisible.toArr(),
    );

    const pathTransformNy = new MyTransform(
      svg.node() as SVGSVGElement,
      viewNy,
    );
    const pathTransformSf = new MyTransform(
      svg.node() as SVGSVGElement,
      viewSf,
    );

    const updateScaleX = (bIndexVisible: AR1Basis) => {
      const bTimeVisible = bIndexVisible.transformWith(this.idxToTime);
      x.domain(bTimeVisible.toArr());
    };

    // bIndexVisible is the visible ends of model
    // affine space at chart edges.
    // They are updated by zoom and pan or animation
    // but unaffected by arrival of new data
    const updateScaleY = (
      bIndexVisible: AR1Basis,
      tree: SegmentTree,
      pathTransform: MyTransform,
      yScale: ScaleLinear<number, number>,
    ) => {
      // Segment tree calculation is expensive; cache for reuse
      const bTemperatureVisible = this.bTemperatureVisible(bIndexVisible, tree);
      // Reference window uses full X range but only visible Y range.
      // Should improve once X and Y are unified into one space.
      pathTransform.onReferenceViewWindowResize(
        this.bIndexFull,
        bTemperatureVisible,
      );

      yScale.domain(bTemperatureVisible.toArr());
    };

    this.treeNy = new SegmentTree(
      this.data,
      this.data.length,
      this.buildSegmentTreeTupleNy,
    );
    this.treeSf = new SegmentTree(
      this.data,
      this.data.length,
      this.buildSegmentTreeTupleSf,
    );

    // All data is initially visible; pass bIndexFull as bIndexVisible
    updateScaleX(this.bIndexFull);
    updateScaleY(this.bIndexFull, this.treeNy, pathTransformNy, yNy);
    updateScaleY(this.bIndexFull, this.treeSf, pathTransformSf, ySf);

    const xAxis = new MyAxis(Orientation.Bottom, x)
      .ticks(4)
      // Tick size must change when the window size changes
      .setTickSize(height)
      .setTickPadding(8 - height);

    const yAxis = new MyAxis(Orientation.Right, yNy, ySf)
      .ticks(4, "s")
      .setTickSize(width)
      .setTickPadding(2 - width);

    const gX = bindAxisToDom(svg, xAxis, x);
    const gY = bindAxisToDom(svg, yAxis, yNy, ySf);

    const zoomArea = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .call(
        d3zoom()
          .scaleExtent([1, 40])
          // Eventually take extent from bScreenVisible, though axis order is unclear
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on("zoom", this.zoomHandler.bind(this)),
      );
    zoomArea.on("mousemove", this.mouseMoveHandler.bind(this));

    let currentPanZoomTransformState: ZoomTransform = null;
    const dotRadius = 3;
    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const makeDot = (view: SVGGElement) =>
      select(view)
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 1)
        .node() as SVGCircleElement;
    const highlightedGreenDot = makeDot(viewNy);
    const highlightedBlueDot = makeDot(viewSf);

    const identityMatrix = document
      .createElementNS("http://www.w3.org/2000/svg", "svg")
      .createSVGMatrix();

    // it's important that we have only 1 instance
    // of drawProc and not one per event
    // Called from zoom and drawNewData
    const scheduleRefresh = drawProc(() => {
      // Apply pan zoom transform
      if (currentPanZoomTransformState != null) {
        d3zoom().transform(zoomArea, currentPanZoomTransformState);
      }

      // Visible index is the same for NY and SF
      const bIndexVisible =
        pathTransformNy.fromScreenToModelBasisX(bScreenXVisible);

      updateScaleX(bIndexVisible);
      updateScaleY(bIndexVisible, this.treeNy, pathTransformNy, yNy);
      updateScaleY(bIndexVisible, this.treeSf, pathTransformSf, ySf);

      pathTransformNy.updateViewNode();
      pathTransformSf.updateViewNode();

      xAxis.axisUp(gX);
      yAxis.axisUp(gY);
    });

    const schedulePointRefresh = drawProc(() => {
      const [greenData, blueData] =
        this.data[Math.round(this.highlightedDataIdx)];

      this.legendTime.text(
        new Date(
          this.idxToTime.applyToPoint(this.highlightedDataIdx),
        ).toLocaleString(),
      );

      const dotScaleMatrixNy = pathTransformNy.dotScaleMatrix(dotRadius);
      const dotScaleMatrixSf = pathTransformSf.dotScaleMatrix(dotRadius);

      const updateDot = (
        greenData: number,
        legend: Selection<BaseType, unknown, HTMLElement, unknown>,
        node: SVGGraphicsElement,
        dotScaleMatrix: SVGMatrix,
      ) => {
        legend.text(fixNaN(greenData, " "));
        updateNode(
          node,
          identityMatrix
            .translate(this.highlightedDataIdx, fixNaN(greenData, 0))
            .multiply(dotScaleMatrix),
        );
      };

      updateDot(
        greenData,
        this.legendGreen,
        highlightedGreenDot,
        dotScaleMatrixNy,
      );
      updateDot(
        blueData,
        this.legendBlue,
        highlightedBlueDot,
        dotScaleMatrixSf,
      );
    });

    pathTransformNy.onViewPortResize(bScreenXVisible, bScreenYVisible);
    pathTransformSf.onViewPortResize(bScreenXVisible, bScreenYVisible);
    pathTransformNy.onReferenceViewWindowResize(this.bIndexFull, bPlaceholder);
    pathTransformSf.onReferenceViewWindowResize(this.bIndexFull, bPlaceholder);

    // Called here and by updateChartWithNewData();
    // should probably live in common.ts
    this.drawNewData = () => {
      // Tree creation shouldn't be duplicated when building the chart
      this.treeNy = new SegmentTree(
        this.data,
        this.data.length,
        this.buildSegmentTreeTupleNy,
      );
      this.treeSf = new SegmentTree(
        this.data,
        this.data.length,
        this.buildSegmentTreeTupleSf,
      );
      const drawLine = (cityIdx: number) =>
        line()
          .defined((d: [number, number]) => {
            return !(isNaN(d[cityIdx]) || d[cityIdx] == null);
          })
          .x((d: [number, number], i: number) => i)
          .y((d: [number, number]) => d[cityIdx]);

      path.attr("d", (cityIndex: number) =>
        drawLine(cityIndex).call(null, this.data),
      );
      scheduleRefresh();
      schedulePointRefresh();
    };

    this.drawNewData();

    // Public method used to relay zoom events to multiple charts
    this.zoom = (d3event: D3ZoomEvent<Element, unknown>) => {
      currentPanZoomTransformState = d3event.transform;

      pathTransformNy.onZoomPan(d3event.transform);
      pathTransformSf.onZoomPan(d3event.transform);
      scheduleRefresh();
      schedulePointRefresh();
    };

    const highlight = (dataIdx: number) => {
      this.highlightedDataIdx = dataIdx;
    };

    this.onHover = (x: number) => {
      // Visible index is the same for NY and SF
      highlight(pathTransformNy.fromScreenToModelX(x));
      schedulePointRefresh();
    };

    this.onHover(width);
  }

  private bTemperatureVisible(
    bIndexVisible: AR1Basis,
    tree: SegmentTree,
  ): AR1Basis {
    // Simple mapping between bases
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    const { min, max } = tree.getMinMax(
      Math.round(minIdxX),
      Math.round(maxIdxX),
    );
    return new AR1Basis(min, max);
  }
}
