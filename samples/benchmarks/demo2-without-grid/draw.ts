import { zoom } from "d3-zoom";
import type { D3ZoomEvent } from "d3-zoom";
import { SegmentTree } from "segment-tree-rmq";
import { timeout as runTimeout } from "d3-timer";
import { selectAll } from "d3-selection";
import type { Selection } from "d3-selection";
import { scaleLinear, scaleOrdinal, scaleTime } from "d3-scale";
import type { ScaleLinear, ScaleOrdinal, ScaleTime } from "d3-scale";
import { line } from "d3-shape";
import type { Line } from "d3-shape";

import type { IMinMax } from "../../../svg-time-series/src/chart/data.ts";

interface IChartData {
  name: string;
  values: number[];
}

interface IChartParameters {
  x: ScaleTime<number, number>;
  y: ScaleLinear<number, number>;
  rx: ScaleTime<number, number>;
  ry: ScaleLinear<number, number>;
  view: Selection<SVGGElement, IChartData, SVGGElement, unknown>;
  data: IChartData[];
  height: number;
  line: Line<number>;
  color: ScaleOrdinal<string, string>;
}

function buildMinMax(a: IMinMax, b: IMinMax): IMinMax {
  return { min: Math.min(a.min, b.min), max: Math.max(a.max, b.max) };
}

const minMaxIdentity: IMinMax = { min: Infinity, max: -Infinity };

function createSegmentTree<T>(
  elements: ReadonlyArray<T>,
  size: number,
  buildTuple: (index: number, elements: ReadonlyArray<T>) => IMinMax,
): SegmentTree<IMinMax> {
  const data: IMinMax[] = Array.from({ length: size }, (_, i) =>
    buildTuple(i, elements),
  );
  return new SegmentTree(data, buildMinMax, minMaxIdentity);
}

function drawProc(f: (...params: unknown[]) => void) {
  let requested = false;

  return function (...params: unknown[]) {
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...params);
      });
    }
  };
}

export class TimeSeriesChart {
  private chart: IChartParameters;
  private minX: Date;
  private maxX: Date;
  private missedStepsCount: number;
  private stepX: number;
  private tree: SegmentTree<IMinMax>;
  private buildSegmentTreeTuple: (
    index: number,
    elements: IChartData[],
  ) => IMinMax;
  private zoomHandler: (event: D3ZoomEvent<SVGSVGElement, unknown>) => void;

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    minX: Date,
    stepX: number,
    data: { NY: number; SF: number }[],
    buildSegmentTreeTuple: (index: number, elements: IChartData[]) => IMinMax,
    zoomHandler: (event: D3ZoomEvent<SVGSVGElement, unknown>) => void,
  ) {
    this.stepX = stepX;
    this.minX = minX;
    this.maxX = this.calcDate(data.length - 1, minX);
    this.buildSegmentTreeTuple = buildSegmentTreeTuple;
    this.zoomHandler = zoomHandler;

    this.drawChart(svg, data);

    this.missedStepsCount = 0;
  }

  public updateChartWithNewData(values: [number, number]) {
    this.missedStepsCount++;

    this.chart.data[0].values.push(values[0]);
    this.chart.data[1].values.push(values[1]);

    this.chart.data[0].values.shift();
    this.chart.data[1].values.shift();

    this.tree = createSegmentTree(
      this.chart.data,
      this.chart.data[0].values.length,
      this.buildSegmentTreeTuple,
    );

    this.drawNewData();
  }

  public zoom = drawProc(
    function (param: [D3ZoomEvent<SVGSVGElement, unknown>]) {
      const zoomTransform = param[0];
      zoom().transform(selectAll(".zoom"), zoomTransform);
      const translateX = zoomTransform.x;
      const scaleX = zoomTransform.k;

      this.chart.rx = zoomTransform.rescaleX(this.chart.x);
      const domainX = this.chart.rx.domain();
      const ySubInterval = this.getZoomIntervalY(
        domainX,
        this.chart.data[0].values.length,
      );
      const minMax = this.tree.query(ySubInterval[0], ySubInterval[1]);
      const domainY = [minMax.min, minMax.max];
      const newRangeY = [this.chart.y(domainY[0]), this.chart.y(domainY[1])];
      const oldRangeY = this.chart.y.range();
      const scaleY = oldRangeY[0] / (newRangeY[0] - newRangeY[1]);
      const translateY = scaleY * (oldRangeY[1] - newRangeY[1]);

      this.chart.view.attr(
        "transform",
        `translate(${translateX},${translateY}) scale(${scaleX},${scaleY})`,
      );
    }.bind(this),
  );

  private drawChart(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    data: { NY: number; SF: number }[],
  ) {
    const width = svg.node().parentNode.clientWidth,
      height = svg.node().parentNode.clientHeight;
    svg.attr("width", width);
    svg.attr("height", height);

    const x = scaleTime().range([0, width]);
    const y = scaleLinear().range([height, 0]);
    const color = scaleOrdinal<string>()
      .domain(["NY", "SF"])
      .range(["green", "blue"]);

    const linex = line<number>()
      .defined((d) => !!d)
      .x((d: number, i: number) => x(this.calcDate(i, this.minX)))
      .y((d: number) => y(d));

    const cities: IChartData[] = color.domain().map((name: string) => {
      return {
        name,
        values: data.map((d: { [key: string]: number }) => +d[name]),
      };
    });

    this.tree = createSegmentTree(
      cities,
      cities[0].values.length,
      this.buildSegmentTreeTuple,
    );

    x.domain([this.minX, this.maxX]);
    const minMax = this.tree.query(0, cities[0].values.length - 1);
    y.domain([minMax.min, minMax.max]);

    const view = svg
      .append("g")
      .selectAll(".view")
      .data(cities)
      .enter()
      .append("g")
      .attr("class", "view");

    view
      .append("path")
      .attr("d", (d: IChartData) => linex(d.values))
      .attr("stroke", (d: IChartData) => color(d.name));

    svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .call(
        zoom()
          .scaleExtent([1, 40])
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on("zoom", this.zoomHandler.bind(this)),
      );

    this.chart = {
      x: x,
      y: y,
      rx: x.copy(),
      ry: y.copy(),
      view: view,
      data: cities,
      height: height,
      line: linex,
      color: color,
    };
  }

  private getZoomIntervalY(
    xSubInterval: [Date, Date],
    intervalSize: number,
  ): [number, number] {
    let from = intervalSize;
    let to = 0;
    Array.from({ length: intervalSize }).forEach((_, i) => {
      if (
        this.calcDate(i, this.minX) >= xSubInterval[0] &&
        this.calcDate(i, this.minX) <= xSubInterval[1]
      ) {
        if (i > to) to = i;
        if (i < from) from = i;
      }
    });
    return [from, to];
  }

  private drawNewData = drawProc(
    function () {
      const stepsToDraw = this.missedStepsCount;
      this.missedStepsCount = 0;

      this.minX = this.calcDate(stepsToDraw, this.minX);
      this.maxX = this.calcDate(
        this.chart.data[0].values.length - 1,
        this.minX,
      );

      const minimumRX = this.calcDate(stepsToDraw, this.chart.rx.domain()[0]);
      const maximumRX = this.calcDate(stepsToDraw, this.chart.rx.domain()[1]);

      this.chart.x.domain([this.minX, this.maxX]);
      this.chart.view
        .selectAll<SVGPathElement, IChartData>("path")
        .attr("d", (d: IChartData) => this.chart.line(d.values));

      this.chart.rx.domain([minimumRX, maximumRX]);
    }.bind(this),
  );

  private calcDate(index: number, offset: Date) {
    return new Date(index * this.stepX + offset.getTime());
  }
}
