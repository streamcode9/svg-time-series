import { ScaleLinear, scaleLinear, ScaleTime, scaleTime } from "d3-scale";
import { BaseType, select, Selection } from "d3-selection";
import { line } from "d3-shape";
import { timeout as runTimeout } from "d3-timer";
import { zoom as d3zoom, ZoomTransform } from "d3-zoom";

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
  scale1: any,
  scale2?: any,
) {
  axis.setScale(scale1, scale2);
  return svg.append("g").attr("class", "axis").call(axis.axis.bind(axis));
}

export class TimeSeriesChart {
  public zoom: (event: any) => void;
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

  // автоморфизм действительных чисел в первой степени
  // преобразование из простраства индексов
  // в пространство времён
  private idxToTime: AR1;

  // преобразование добавления точки
  // когда добавляем точку в массиив надо
  // idxToTime.composeWith(idxShift)
  // это автоморфизм пространства индексов
  // то есть преобразование пространства индексов
  // в себя, а не в другое пространство
  private idxShift: AR1;

  // две точки - начало и конец массива в пространстве индексов
  // стоит думать о них как об абстрактных точках
  // нарисованных в мире за телевизором на наших графиках
  // а не в терминах их координат
  private bIndexFull: AR1Basis;

  private buildSegmentTreeTupleNy: (index: number, elements: any) => IMinMax;
  private buildSegmentTreeTupleSf: (index: number, elements: any) => IMinMax;
  private zoomHandler: (event: any) => void;
  private mouseMoveHandler: (event: any) => void;

  private legendTime: Selection<BaseType, {}, HTMLElement, any>;
  private legendGreen: Selection<BaseType, {}, HTMLElement, any>;
  private legendBlue: Selection<BaseType, {}, HTMLElement, any>;

  private highlightedDataIdx: number;

  constructor(
    svg: Selection<BaseType, {}, HTMLElement, any>,
    legend: Selection<BaseType, {}, HTMLElement, any>,
    startTime: number,
    timeStep: number,
    data: Array<[number, number]>,
    buildSegmentTreeTupleNy: (index: number, elements: any) => IMinMax,
    buildSegmentTreeTupleSf: (index: number, elements: any) => IMinMax,
    zoomHandler: (event: any) => void,
    mouseMoveHandler: (event: any) => void,
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    // здесь второй базис образован не двумя точками, а
    // эквивалентно точкой и вектором
    // хорошо бы сделать например basisAR1PV()
    // типа смарт-конструктор
    // интересно что есть короткая эквивалентная формулировка
    // this.idxToSpace = new AR1(startTime, timeStep)
    // но она возвращает нас к координатному мышлению
    this.idxToTime = betweenTBasesAR1(
      bUnit,
      new AR1Basis(startTime, startTime + timeStep),
    );

    // при добавлении точки первый и второй элемент
    // становятся на место нулевого и первого соответственно
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

    // это просто извращённый способ добавить
    // в группу два элемента <g>
    // .enter() это часть фреймворка d3 для работы
    // с обновлениями, но мы пока игнорируем и
    // делаем обновления руками
    const views = svg
      .selectAll("g")
      .data([0, 1])
      .enter()
      .append("g")
      .attr("class", "view");
    const [viewNy, viewSf] = views.nodes() as SVGGElement[];

    const path = views.append("path");

    // тут наши перевернутые базисы которые мы
    // cтеснительно запрятали в onViewPortResize
    // таки вылезли

    // на видимую область можно смотреть абстрактно
    // как на отдельное пространство

    // ось Y перевернута - что выглядит на языке
    // базисов как перевернутый базис
    //
    // а на языке векторов как разность точек, которая
    // у X положительна а у Y отрицательна
    // ну и наоборот если перевернем первый базис
    // то второй тоже перевернется но переворачивание
    // по-прежнему выглядит как умножение разности на -1
    //
    // короче неважно какой из них считать первичным
    // в любом случае один перевернут по отношению к другому
    const bScreenXVisible = new AR1Basis(0, width);
    const bScreenYVisible = new AR1Basis(height, 0);

    // интерфейс с лигаси-кодом. Некоторая многословость простительна
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
      // рассчитается деревом отрезков, но все равно долго
      // так что нужно сохранить чтобы
      // два раза не перевычислять для линий графиков и для осей
      const bTemperatureVisible = this.bTemperatureVisible(bIndexVisible, tree);
      // референсное окно имеет достаточно странный вид
      // по горизонтали у нас полный диапазон
      // а по вертикали только видимый
      // надеюсь это исправится при переходе от отдельных
      // пространств по Х и Y к единому пространству
      // являющeмся их прямым произведением
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

    // в референсном окне видны все данные, поэтому
    // передаем bIndexFull в качестее bIndexVisible
    updateScaleX(this.bIndexFull);
    updateScaleY(this.bIndexFull, this.treeNy, pathTransformNy, yNy);
    updateScaleY(this.bIndexFull, this.treeSf, pathTransformSf, ySf);

    const xAxis = new MyAxis(Orientation.Bottom, x)
      .ticks(4)
      // изменять размер тиков надо при изменении
      // размеров окна
      .setTickSize(height)
      .setTickPadding(8 - height);

    const yAxis = new MyAxis(Orientation.Right, yNy, ySf)
      .ticks(4, "s")
      .setTickSize(width)
      .setTickPadding(2 - width);

    const gX = bindAxisToDom(svg, xAxis, x);
    const gY = bindAxisToDom(svg, yAxis, yNy, ySf);

    const zoomArea: Selection<any, any, any, any> = svg
      .append("rect")
      .attr("class", "zoom")
      .attr("width", width)
      .attr("height", height)
      .call(
        d3zoom()
          .scaleExtent([1, 40])
          // в перспективе взять экстент из bScreenVisible
          // хотя хез как быть с другим порядком
          .translateExtent([
            [0, 0],
            [width, height],
          ])
          .on("zoom", this.zoomHandler.bind(this)),
      );
    zoomArea.on("mousemove", this.mouseMoveHandler.bind(this));

    let currentPanZoomTransformState: ZoomTransform = null;
    const dotRadius = 3;
    const fixNaN = (n: number, valueForNaN: any) =>
      isNaN(n) ? valueForNaN : n;
    const makeDot = (view: any) =>
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
    // вызывается из zoom и drawNewData
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
        legend: Selection<BaseType, {}, HTMLElement, any>,
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

    // вызывается здесь ниже
    // и из публичного updateChartWithNewData()
    // но в принципе должно быть в common.ts
    this.drawNewData = () => {
      // создание дерева не должно
      // дублироваться при создании чарта
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

    // публичный метод, используется для ретрансляции
    // зум-события нескольким графикам
    this.zoom = (d3event: any) => {
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
    // просто функция между базисами
    const [minIdxX, maxIdxX] = bIndexVisible.toArr();
    const { min, max } = tree.getMinMax(
      Math.round(minIdxX),
      Math.round(maxIdxX),
    );
    return new AR1Basis(min, max);
  }
}
