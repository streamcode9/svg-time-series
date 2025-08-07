/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { select } from "d3-selection";
import { AR1Basis } from "../math/affine.ts";
import { TimeSeriesChart } from "../draw.ts";

class Matrix {
  constructor(
    public tx = 0,
    public ty = 0,
  ) {}
  translate(tx: number, ty: number) {
    return new Matrix(this.tx + tx, this.ty + ty);
  }
  scaleNonUniform(_sx: number, _sy: number) {
    return this;
  }
  multiply(_m: Matrix) {
    return this;
  }
}

const nodeTransforms = new Map<SVGGraphicsElement, Matrix>();
let updateNodeCalls = 0;
vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (node: SVGGraphicsElement, matrix: Matrix) => {
    updateNodeCalls++;
    nodeTransforms.set(node, matrix);
  },
}));

let currentDataLength = 0;
const transformInstances: any[] = [];
vi.mock("../ViewportTransform.ts", () => ({
  ViewportTransform: class {
    constructor() {
      transformInstances.push(this);
    }
    onZoomPan = vi.fn();
    fromScreenToModelX = vi.fn((x: number) => x);
    fromScreenToModelBasisX = vi.fn(
      () => new AR1Basis(0, Math.max(currentDataLength - 1, 0)),
    );
    dotScaleMatrix = vi.fn(() => new Matrix());
    onViewPortResize = vi.fn();
    onReferenceViewWindowResize = vi.fn();
  },
}));

const axisInstances: any[] = [];
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
    const behavior: any = () => {};
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

  const chart = new TimeSeriesChart(
    select(svgEl) as any,
    select(legend) as any,
    0,
    1,
    data,
    (i, arr) => ({ min: arr[i][0], max: arr[i][0] }),
    (i, arr) => ({ min: arr[i][1]!, max: arr[i][1]! }),
    true,
    () => {},
    () => {},
    formatTime,
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
  (SVGSVGElement.prototype as any).createSVGMatrix = () => new Matrix();
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

    const xAxis = axisInstances[0];
    const yAxis = axisInstances[1];
    const mtNy = transformInstances[0];
    const mtSf = transformInstances[1];
    const xCalls = xAxis.axisUpCalls;
    const yCalls = yAxis.axisUpCalls;
    const callCount = updateNodeCalls;

    zoom({ transform: { x: 10, k: 2 } } as any);
    vi.runAllTimers();

    expect(mtNy.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(mtSf.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(updateNodeCalls).toBeGreaterThan(callCount);
    expect(xAxis.axisUpCalls).toBeGreaterThan(xCalls);
    expect(yAxis.axisUpCalls).toBeGreaterThan(yCalls);
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
    expect(greenTransform.ty).toBe(0);
    expect(blueTransform.tx).toBe(1);
    expect(blueTransform.ty).toBe(0);
  });

  it("updates circles after appending data", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
    ];
    const { onHover, svgEl, legend, chart } = createChart(data);
    vi.runAllTimers();

    chart.updateChartWithNewData([50, 60]);
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
    expect(greenTransform.ty).toBe(0);
    expect(blueTransform.tx).toBe(1);
    expect(blueTransform.ty).toBe(0);
  });

  it("uses custom time formatter when provided", () => {
    const data: Array<[number, number]> = [
      [10, 20],
      [30, 40],
    ];
    const formatter = vi.fn((ts: number) => `ts:${ts}`);
    const { onHover, legend } = createChart(data, formatter);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(legend.querySelector(".chart-legend__time")!.textContent).toBe(
      "ts:1",
    );
    expect(formatter).toHaveBeenCalledWith(1);
  });

  it("handles NaN data", () => {
    const { onHover, svgEl, legend } = createChart([[NaN, NaN]]);
    vi.runAllTimers();

    onHover(0);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe(" ");
    expect(legend.querySelector(".chart-legend__blue_value")!.textContent).toBe(
      " ",
    );

    const circles = svgEl.querySelectorAll("circle");
    const greenTransform = nodeTransforms.get(circles[0] as SVGCircleElement)!;
    const blueTransform = nodeTransforms.get(circles[1] as SVGCircleElement)!;
    expect(greenTransform.ty).toBe(0);
    expect(blueTransform.ty).toBe(0);
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
    expect(greenTransform.ty).toBe(50);
    expect(blueTransform.tx).toBe(0);
    expect(blueTransform.ty).toBe(50);

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
    expect(greenTransform.ty).toBe(0);
    expect(blueTransform.tx).toBe(2);
    expect(blueTransform.ty).toBe(0);
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

    const chart = new TimeSeriesChart(
      select(svgEl) as any,
      select(legend) as any,
      0,
      1,
      [
        [0, 0],
        [1, 1],
      ],
      (i, arr) => ({ min: arr[i][0], max: arr[i][0] }),
      (i, arr) => ({ min: arr[i][1]!, max: arr[i][1]! }),
      true,
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
