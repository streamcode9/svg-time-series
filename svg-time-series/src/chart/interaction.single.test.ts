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
import type * as d3Zoom from "d3-zoom";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { LegendController } from "../../../samples/LegendController.ts";
import { polyfillDom } from "../setupDom.ts";
await polyfillDom();

const nodeTransforms = new Map<SVGGraphicsElement, DOMMatrix>();
let updateNodeCalls = 0;
vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (node: SVGGraphicsElement, matrix: DOMMatrix) => {
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
    matrix = new DOMMatrix();
    onZoomPan = vi.fn();
    fromScreenToModelX = vi.fn((x: number) => x);
    fromScreenToModelBasisX = vi.fn(
      () => [0, Math.max(currentDataLength - 1, 0)] as [number, number],
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

vi.mock("d3-zoom", async () => {
  const actual = await vi.importActual<typeof d3Zoom>("d3-zoom");
  return {
    ...actual,
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
  };
});

function createChart(data: Array<[number]>) {
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
    '<span class="chart-legend__green_value"></span>';

  const source: IDataSource = {
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesAxes: [0],
    getSeries: (i) => data[i]![0],
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
    SVGSVGElement.prototype as unknown as { createSVGMatrix: () => DOMMatrix }
  ).createSVGMatrix = () => new DOMMatrix();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe("chart interaction single-axis", () => {
  it("zoom updates transform and axes", () => {
    const { zoom } = createChart([[0], [1]]);
    vi.runAllTimers();

    const xAxis = axisInstances[0]!;
    const yAxis = axisInstances[1]!;
    const mtNy = transformInstances[0]!;
    const mtX = transformInstances[1]!;
    const xCalls = xAxis.axisUpCalls;
    const yCalls = yAxis.axisUpCalls;
    const callCount = updateNodeCalls;

    zoom({
      transform: { x: 10, k: 2 },
      sourceEvent: new Event("wheel"),
    } as Parameters<typeof zoom>[0]);
    vi.runAllTimers();
    zoom({ transform: { x: 10, k: 2 } } as Parameters<typeof zoom>[0]);
    vi.runAllTimers();

    expect(mtNy.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(mtX.onZoomPan).toHaveBeenCalledWith({ x: 10, k: 2 });
    expect(transformInstances.length).toBe(2);
    expect(updateNodeCalls).toBeGreaterThanOrEqual(callCount);
    expect(xAxis.axisUpCalls).toBeGreaterThanOrEqual(xCalls);
    expect(yAxis.axisUpCalls).toBeGreaterThanOrEqual(yCalls);
  });

  it("onHover updates legend text and dot position", () => {
    const data: Array<[number]> = [[10], [30]];
    const { onHover, svgEl, legend } = createChart(data);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("30");

    const circle = svgEl.querySelector<SVGCircleElement>("circle")!;
    const transform = nodeTransforms.get(circle)!;
    expect(transform.e).toBe(1);
    expect(transform.f).toBe(30);
  });

  it("updates circle after appending data", () => {
    const data: Array<[number]> = [[10], [30]];
    const { onHover, svgEl, legend, chart } = createChart(data);
    vi.runAllTimers();

    chart.updateChartWithNewData(50);
    vi.runAllTimers();

    onHover(1);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("50");

    const circle = svgEl.querySelector<SVGCircleElement>("circle")!;
    const transform = nodeTransforms.get(circle)!;
    expect(transform.e).toBe(1);
    expect(transform.f).toBe(50);
  });

  it("throws when data contains Infinity", () => {
    expect(() => createChart([[Infinity]])).toThrow(/finite number or NaN/);
  });

  it("throws on zero-length dataset", () => {
    expect(() => {
      createChart([]);
      vi.runAllTimers();
    }).toThrow();
  });
});
