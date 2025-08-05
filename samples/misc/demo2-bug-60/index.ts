import { scaleLinear, scaleTime } from "d3-scale";
import { ValueFn, BaseType, select, selectAll, Selection } from "d3-selection";
import { line } from "d3-shape";
import { timeout as runTimeout, timer as runTimer } from "d3-timer";
import { zoomIdentity, zoom as d3zoom, ZoomTransform } from "d3-zoom";

import { MyAxis, Orientation } from "../../../svg-time-series/src/axis.ts";
import { MyTransform } from "../../../svg-time-series/src/MyTransform.ts";
import {
  IMinMax,
  SegmentTree,
} from "../../../svg-time-series/src/segmentTree.ts";
import {
  AR1Basis,
  AR1,
  betweenTBasesAR1,
  bPlaceholder,
  bUnit,
} from "../../../svg-time-series/src/math/affine.ts";
import { onCsv } from "../../demos/common.ts";

function buildSegmentTreeTuple(index: number, elements: number[][]): IMinMax {
  const nyMinValue = isNaN(elements[index][0]) ? Infinity : elements[index][0];
  const nyMaxValue = isNaN(elements[index][0]) ? -Infinity : elements[index][0];
  const sfMinValue = isNaN(elements[index][1]) ? Infinity : elements[index][1];
  const sfMaxValue = isNaN(elements[index][1]) ? -Infinity : elements[index][1];
  return {
    min: Math.min(nyMinValue, sfMinValue),
    max: Math.max(nyMaxValue, sfMaxValue),
  };
}

export function drawCharts(data: [number, number][]) {
  const charts: TimeSeriesChart[] = [];

  const onZoom = (event: any) => charts.forEach((c) => c.zoom(event));

  const onSelectChart: ValueFn<any, any, any> = function (
    element: any,
    datum: any,
    descElement: any,
  ) {
    const chart = new TimeSeriesChart(
      select(this),
      Date.now(),
      86400000,
      data.map((_) => _),
      buildSegmentTreeTuple,
      onZoom,
    );
    charts.push(chart);
  };

  selectAll("svg").each(onSelectChart);
}

onCsv((data: [number, number][]) => {
  drawCharts(data);
});

function drawProc(f: Function) {
  let requested = false;

  return (...params: any[]) => {
    if (!requested) {
      requested = true;
      runTimeout((elapsed: number) => {
        requested = false;
        f(params);
      });
    }
  };
}

function bindAxisToDom(
  svg: Selection<BaseType, {}, HTMLElement, any>,
  axis: any,
  scale: any,
) {
  axis.setScale(scale);
  return svg.append("g").attr("class", "axis").call(axis.axis.bind(axis));
}

export class TimeSeriesChart {
  public zoom: (event: any) => void;
  private drawNewData: () => void;
  private data: Array<[number, number]>;

  // updated when a new point is added
  private tree: SegmentTree;

  // Updated when a new point is added
  // used to convert indices to dates shown by X axis
  // Date.now() style timestamp
  private timeAtIdx0: number;

  // Step by X axis
  // Date.now() style timestamp delta
  private timeStep: number;

  // ����������� �������������� ����� � ������ �������
  // �������������� �� ����������� ��������
  // � ������������ �����
  private idxToTime: AR1;

  // �������������� ���������� �����
  // ����� ��������� ����� � ������� ����
  // idxToTime.composeWith(idxShift)
  // ��� ����������� ������������ ��������
  // �� ���� �������������� ������������ ��������
  // � ����, � �� � ������ ������������
  private idxShift: AR1;

  // ��� ����� - ������ � ����� ������� � ������������ ��������
  // ����� ������ � ��� ��� �� ����������� ������
  // ������������ � ���� �� ����������� �� ����� ��������
  // � �� � �������� �� ���������
  private bIndexFull: AR1Basis;

  private buildSegmentTreeTuple: (index: number, elements: any) => IMinMax;
  private zoomHandler: (event: any) => void;

  constructor(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    startTime: number,
    timeStep: number,
    data: Array<[number, number]>,
    buildSegmentTreeTuple: (index: number, elements: any) => IMinMax,
    zoomHandler: (event: any) => void,
  ) {
    // ����� ������ ����� ��������� �� ����� �������, �
    // ������������ ������ � ��������
    // ������ �� ������� �������� basisAR1PV()
    // ���� �����-�����������
    // ��������� ��� ���� �������� ������������� ������������
    // this.idxToSpace = new AR1(startTime, timeStep)
    // �� ��� ���������� ��� � ������������� ��������
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(startTime, startTime + timeStep),
    );

    // ��� ���������� ����� ������ � ������ �������
    // ���������� �� ����� �������� � ������� ��������������
    this.idxShift = betweenTBasesAR1(new AR1Basis(1, 2), bUnit);
    this.buildSegmentTreeTuple = buildSegmentTreeTuple;
    this.zoomHandler = zoomHandler;
    this.bIndexFull = new AR1Basis(0, data.length - 1);
    this.drawChart(svg, data);
  }

  private drawChart(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    data: Array<[number, number]>,
  ) {
    this.data = data;

    const node: SVGSVGElement = svg.node() as SVGSVGElement;
    const div: HTMLElement = node.parentNode as HTMLElement;

    const width = div.clientWidth;
    const height = div.clientHeight;

    svg.attr("width", width);
    svg.attr("height", height);

    const view = svg.select("g.view");

    // ��� ������ ����������� ������ ��������
    // � ������ ��� �������� <path>
    // .enter() ��� ����� ���������� d3 ��� ������
    // � ������������, �� �� ���� ���������� �
    // ������ ���������� ������
    const path = view.selectAll("path").data([0, 1]).enter().append("path");

    // ��� ���� ������������ ������ ������� ��
    // c����������� ��������� � onViewPortResize
    // ���� �������

    // �� ������� ������� ����� �������� ����������
    // ��� �� ��������� ������������

    // ��� Y ����������� - ��� �������� �� �����
    // ������� ��� ������������ �����
    //
    // � �� ����� �������� ��� �������� �����, �������
    // � X ������������ � � Y ������������
    // �� � �������� ���� ���������� ������ �����
    // �� ������ ���� ������������ �� ���������������
    // ��-�������� �������� ��� ��������� �������� �� -1
    //
    // ������ ������� ����� �� ��� ������� ���������
    // � ����� ������ ���� ���������� �� ��������� � �������
    const bScreenXVisible = new AR1Basis(0, width);
    const bScreenYVisible = new AR1Basis(height, 0);

    // ��������� � ������-�����. ��������� ������������� ������������
    const x = scaleTime().range(bScreenXVisible.toArr());
    const y = scaleLinear().range(bScreenYVisible.toArr());
    const viewNode: SVGGElement = view.node() as SVGGElement;
    const pathTransform = new MyTransform(
      svg.node() as SVGSVGElement,
      viewNode,
    );

    // bIndexVisible is the visible ends of model
    // affine space at chart edges.
    // They are updated by zoom and pan or animation
    // but unaffected by arrival of new data
    const updateScales = (bIndexVisible: AR1Basis) => {
      // ������������ ������� ��������, �� ��� ����� �����
      // ��� ��� ����� ��������� �����
      // ��� ���� �� ������������� ��� ����� �������� � ��� ����
      const bTemperatureVisible = this.bTemperatureVisible(bIndexVisible);
      // ����������� ���� ����� ���������� �������� ���
      // �� ����������� � ��� ������ ��������
      // � �� ��������� ������ �������
      // ������� ��� ���������� ��� �������� �� ���������
      // ����������� �� � � Y � ������� ������������
      // ������e��� �� ������ �������������
      pathTransform.onReferenceViewWindowResize(
        this.bIndexFull,
        bTemperatureVisible,
      );

      const bTimeVisible = bIndexVisible.transformWith(this.idxToTime);
      x.domain(bTimeVisible.toArr());
      y.domain(bTemperatureVisible.toArr());
    };

    this.tree = new SegmentTree(
      this.data,
      this.data.length,
      this.buildSegmentTreeTuple,
    );

    // � ����������� ���� ����� ��� ������, �������
    // �������� bIndexFull � �������� bIndexVisible
    updateScales(this.bIndexFull);

    const xAxis = new MyAxis(Orientation.Bottom, x)
      .ticks(4)
      // �������� ������ ����� ���� ��� ���������
      // �������� ����
      .setTickSize(height)
      .setTickPadding(8 - height);

    const yAxis = new MyAxis(Orientation.Right, y)
      .ticks(4, "s")
      .setTickSize(width)
      .setTickPadding(2 - width);

    const gX = bindAxisToDom(svg, xAxis, x);
    const gY = bindAxisToDom(svg, yAxis, y);

    // it's important that we have only 1 instance
    // of drawProc and not one per event
    // ���������� �� zoom � drawNewData
    const scheduleRefresh = drawProc(() => {
      const bIndexVisible =
        pathTransform.fromScreenToModelBasisX(bScreenXVisible);
      updateScales(bIndexVisible);
      pathTransform.updateViewNode();

      xAxis.axisUp(gX);
      yAxis.axisUp(gY);
    });
    pathTransform.onViewPortResize(bScreenXVisible, bScreenYVisible);
    pathTransform.onReferenceViewWindowResize(this.bIndexFull, bPlaceholder);
    svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .call(
        d3zoom()
          .scaleExtent([1, 40])
          // � ����������� ����� ������� �� bScreenVisible
          // ���� ��� ��� ���� � ������ ��������
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on("zoom", this.zoomHandler.bind(this)),
      );

    // ���������� ����� ����
    // � �� ���������� updateChartWithNewData()
    // �� � �������� ������ ���� � common.ts
    this.drawNewData = () => {
      // �������� ������ �� ������
      // ������������� ��� �������� �����
      this.tree = new SegmentTree(
        this.data,
        this.data.length,
        this.buildSegmentTreeTuple,
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
    };

    this.drawNewData();

    // ��������� �����, ������������ ��� ������������
    // ���-������� ���������� ��������
    this.zoom = (event: any) => {
      pathTransform.onZoomPan(event.transform);
      scheduleRefresh();
    };

    function raisedCos(elapsed: number) {
      return -(Math.cos(elapsed / 6500) - 1) / 2;
    }

    function animateCosDown(maxX: number, minX: number, elapsed: number) {
      return maxX - (maxX - minX) * raisedCos(elapsed);
    }

    let offsetX = 0;
    let offsetDelta = 100;
    let panDirection = 1;
    const f = (elapsed: number) => {
      pathTransform.onZoomPan(
        zoomIdentity.translate(-1000 + offsetX * panDirection, 0).scale(40),
      );
      offsetX = offsetX + offsetDelta;
      panDirection = -panDirection;
      offsetDelta = offsetX > 1000 || offsetX < 0 ? -offsetDelta : offsetDelta;
      scheduleRefresh();
    };

    const timer = runTimer((elapsed: number) => {
      f(elapsed);
      if (elapsed > 60 * 1000) {
        timer.stop();
      }
    });
  }

  private bTemperatureVisible(bIndexVisible: AR1Basis): AR1Basis {
    // ������ ������� ����� ��������
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    const { min, max } = this.tree.getMinMax(minIdxX, maxIdxX);
    return new AR1Basis(min, max);
  }
}
