/**
 * @vitest-environment jsdom
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { AR1Basis } from "../math/affine.ts";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { LegendController } from "../../../samples/LegendController.ts";
import { Matrix } from "../setupDom.ts";
import type { D3ZoomEvent } from "d3-zoom";

const nodeTransforms = new Map<SVGGraphicsElement, Matrix>();
let updateNodeCalls = 0;
vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (node: SVGGraphicsElement, matrix: Matrix) => {
    updateNodeCalls++;
    nodeTransforms.set(node, matrix);
  },
}));

let currentDataLength = 0;
const transformInstances: Array<{ onZoomPan: Mock }> = [];
vi.mock("../ViewportTransform.ts", () => ({
  ViewportTransform: class {
    constructor() {
      transformInstances.push(this);
    }
    matrix = new Matrix();
    onZoomPan = vi.fn();
    fromScreenToModelX = vi.fn((x: number) => x);
    fromScreenToModelBasisX = vi.fn(
      () => new AR1Basis(0, Math.max(currentDataLength - 1, 0)),
    );
    onViewPortResize = vi.fn();
    onReferenceViewWindowResize = vi.fn();
  },
}));

const axisInstances: Array<{ axisUpCalls: number; axisUp: Mock }> = [];
vi.mock("../axis.ts", () => ({
  Orientation: { Bottom: 0, Right: 1 },
  MyAxis: class {
    axisUpCalls = 0;
    constructor() {
      axisInstances.push(this);
    }
    setScale = vi.fn(() => this);
    axis = vi.fn();
    axisUp = vi.fn(() => {
      this.axisUpCalls++;
    });
    ticks = vi.fn(() => this);
    setTickSize = vi.fn(() => this);
    setTickPadding = vi.fn(() => this);
  },
}));

vi.mock("d3-zoom", () => ({
  zoom: () => {
    interface ZoomBehavior {
      (): void;
      scaleExtent: () => ZoomBehavior;
      translateExtent: () => ZoomBehavior;
      on: () => ZoomBehavior;
      transform: () => void;
    }
    const behavior = (() => {}) as ZoomBehavior;
    behavior.scaleExtent = () => behavior;
    behavior.translateExtent = () => behavior;
    behavior.on = () => behavior;
    behavior.transform = () => {};
    return behavior;
  },
}));

function createChart(
  data: Array<[number, number]>,
  formatTime?: (timestamp: number) => string,
) {
  currentDataLength = data.length;
  const parent = document.createElement("div");
  const w = Math.max(currentDataLength - 1, 0);
  Object.defineProperty(parent, "clientWidth", {
    value: w,
    configurable: true,
  });
  Object.defineProperty(parent, "clientHeight", {
    value: 50,
    configurable: true,
  });
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  parent.appendChild(svgEl);

  const legend = document.createElement("div");
  legend.innerHTML =
    '<span class="chart-legend__time"></span>' +
    '<span class="chart-legend__green_value"></span>' +
    '<span class="chart-legend__blue_value"></span>';

  const source: IDataSource = {
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: 2,
    seriesAxes: [0, 1],
    getSeries: (i, seriesIdx) => data[i]![seriesIdx]!,
  };
  const legendController = new LegendController(
    select(legend) as unknown as Selection<
      HTMLElement,
      unknown,
      HTMLElement,
      unknown
    >,
    formatTime,
  );
  const chart = new TimeSeriesChart(
    select(svgEl) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >,
    source,
    legendController,
    () => {},
    () => {},
  );

  return {
    zoom: chart.zoom,
    onHover: chart.onHover,
    svgEl,
    legend,
    chart,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  nodeTransforms.clear();
  updateNodeCalls = 0;
  transformInstances.length = 0;
  axisInstances.length = 0;
  (
    SVGSVGElement.prototype as unknown as { createSVGMatrix: () => Matrix }
  ).createSVGMatrix = () => new Matrix();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe("chart interaction", () => {
  it("zoom updates transforms and axes", () => {
    const { zoom } = createChart([
      [0, 0],
      [1, 1],
    ]);
    vi.runAllTimers();

    const xAxis = axisInstances[0]!;
    const yAxis = axisInstances[1]!;
    const mtNy = transformInstances[0]!;
    const mtSf = transformInstances[1]!;
    const xCalls = xAxis.axisUpCalls;
    const yCalls = yAxis.axisUpCalls;
    const callCount = updateNodeCalls;

    zoom({ transform: { x: 10, k: 2 } } as unknown as D3ZoomEvent<
      SVGRectElement,
      unknown
    >);
    vi.runAllTimers();
    vi.runAllTimers();

    expect(mtNy.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(mtSf.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(updateNodeCalls).toBeGreaterThan(callCount);
    expect(xAxis.axisUpCalls).toBeGreaterThanOrEqual(xCalls);
    expect(yAxis.axisUpCalls).toBeGreaterThanOrEqual(yCalls);
  });

  it("onHover updates legend text and dot positions", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
    ];
    const { onHover, svgEl, legend } = createChart(data);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("30");
    expect(legend.querySelector(".chart-legend__blue_value")!.textContent).toBe(
      "40",
    );

    const circles = svgEl.querySelectorAll("circle");
    const greenTransform = nodeTransforms.get(circles[0] as SVGCircleElement)!;
    const blueTransform = nodeTransforms.get(circles[1] as SVGCircleElement)!;
    expect(greenTransform.tx).toBe(1);
    expect(greenTransform.ty).toBe(30);
    expect(blueTransform.tx).toBe(1);
    expect(blueTransform.ty).toBe(40);
  });

  it("updates circles after appending data", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
    ];
    const { onHover, svgEl, legend, chart } = createChart(data);
    vi.runAllTimers();

    chart.updateChartWithNewData(50, 60);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("50");
    expect(legend.querySelector(".chart-legend__blue_value")!.textContent).toBe(
      "60",
    );

    const circles = svgEl.querySelectorAll("circle");
    const greenTransform = nodeTransforms.get(circles[0] as SVGCircleElement)!;
    const blueTransform = nodeTransforms.get(circles[1] as SVGCircleElement)!;
    expect(greenTransform.tx).toBe(1);
    expect(greenTransform.ty).toBe(50);
    expect(blueTransform.tx).toBe(1);
    expect(blueTransform.ty).toBe(60);
  });

  it("uses custom time formatter when provided", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
    ];
    const formatter = vi.fn((ts: number) => `ts:${String(ts)}`);
    const { onHover, legend } = createChart(data, formatter);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(legend.querySelector(".chart-legend__time")!.textContent).toBe(
      "ts:1",
    );
    expect(formatter).toHaveBeenCalledWith(1);
  });

  it("throws when data contains Infinity", () => {
    expect(() => createChart([[Infinity, Infinity]])).toThrow(
      /finite number or NaN/,
    );
  });

  it("clamps hover index to data bounds", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
      [50, 60],
    ];
    const { onHover, svgEl, legend } = createChart(data);
    vi.runAllTimers();

    onHover(-100);
    vi.runAllTimers();
    let circles = svgEl.querySelectorAll("circle");
    let greenTransform = nodeTransforms.get(circles[0] as SVGCircleElement)!;
    let blueTransform = nodeTransforms.get(circles[1] as SVGCircleElement)!;
    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("10");
    expect(legend.querySelector(".chart-legend__blue_value")!.textContent).toBe(
      "20",
    );
    expect(greenTransform.tx).toBe(0);
    expect(greenTransform.ty).toBe(10);
    expect(blueTransform.tx).toBe(0);
    expect(blueTransform.ty).toBe(20);

    onHover(100);
    vi.runAllTimers();
    circles = svgEl.querySelectorAll("circle");
    greenTransform = nodeTransforms.get(circles[0] as SVGCircleElement)!;
    blueTransform = nodeTransforms.get(circles[1] as SVGCircleElement)!;
    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("50");
    expect(legend.querySelector(".chart-legend__blue_value")!.textContent).toBe(
      "60",
    );
    expect(greenTransform.tx).toBe(2);
    expect(greenTransform.ty).toBe(50);
    expect(blueTransform.tx).toBe(2);
    expect(blueTransform.ty).toBe(60);
  });

  it("throws on zero-length dataset", () => {
    expect(() => {
      createChart([]);
      vi.runAllTimers();
    }).toThrow();
  });

  it("dispose removes event listeners and DOM elements", () => {
    const parent = document.createElement("div");
    Object.defineProperty(parent, "clientWidth", {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(parent, "clientHeight", {
      value: 10,
      configurable: true,
    });
    const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    parent.appendChild(svgEl);
    const legend = document.createElement("div");
    legend.innerHTML =
      '<span class="chart-legend__time"></span>' +
      '<span class="chart-legend__green_value"></span>' +
      '<span class="chart-legend__blue_value"></span>';

    const mouseMoveHandler = vi.fn();

    const source: IDataSource = {
      startTime: 0,
      timeStep: 1,
      length: 2,
      seriesCount: 2,
      seriesAxes: [0, 1],
      getSeries: (i) => [0, 1][i]!,
    };
    const legendController = new LegendController(
      select(legend) as unknown as Selection<
        HTMLElement,
        unknown,
        HTMLElement,
        unknown
      >,
    );
    const chart = new TimeSeriesChart(
      select(svgEl) as unknown as Selection<
        SVGSVGElement,
        unknown,
        HTMLElement,
        unknown
      >,
      source,
      legendController,
      () => {},
      mouseMoveHandler,
    );

    const zoomRect = svgEl.querySelector("rect.zoom") as SVGRectElement;
    expect(zoomRect).not.toBeNull();

    zoomRect.dispatchEvent(new MouseEvent("mousemove"));
    expect(mouseMoveHandler).toHaveBeenCalledTimes(1);

    chart.dispose();

    expect(svgEl.querySelector("rect.zoom")).toBeNull();
    expect(svgEl.querySelectorAll("circle").length).toBe(0);

    mouseMoveHandler.mockClear();
    zoomRect.dispatchEvent(new MouseEvent("mousemove"));
    expect(mouseMoveHandler).not.toHaveBeenCalled();
  });
});
