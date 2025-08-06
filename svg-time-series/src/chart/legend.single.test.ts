/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { select } from "d3-selection";
import { AR1Basis } from "../math/affine.ts";
import { ChartData } from "./data.ts";
import { setupRender } from "./render.ts";
import { LegendController } from "./legend.ts";

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

function createLegend(data: Array<[number]>) {
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

  const chartData = new ChartData(0, 1, data, (i, arr) => ({
    min: arr[i][0],
    max: arr[i][0],
  }));

  const renderState = setupRender(select(svgEl) as any, chartData, false);
  const controller = new LegendController(
    select(legend) as any,
    renderState,
    chartData,
  );

  return { controller, svgEl, legend };
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

describe("legend controller single-axis", () => {
  it("onHover updates legend text and dot position", () => {
    const data: Array<[number]> = [[10], [30]];
    const { controller, svgEl, legend } = createLegend(data);
    vi.runAllTimers();

    controller.onHover(1);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("30");
    const circle = svgEl.querySelector("circle")! as SVGCircleElement;
    const transform = nodeTransforms.get(circle)!;
    expect(transform.tx).toBe(1);
    expect(transform.ty).toBe(30);
  });

  it("handles NaN data", () => {
    const { controller, svgEl, legend } = createLegend([[NaN]]);
    vi.runAllTimers();

    controller.onHover(0);
    vi.runAllTimers();

    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe(" ");
    const circle = svgEl.querySelector("circle")! as SVGCircleElement;
    const transform = nodeTransforms.get(circle)!;
    expect(transform.ty).toBe(0);
  });

  it("clamps hover index to data bounds", () => {
    const data: Array<[number]> = [[10], [30]];
    const { controller, svgEl, legend } = createLegend(data);
    vi.runAllTimers();

    controller.onHover(-100);
    vi.runAllTimers();
    let circle = svgEl.querySelector("circle")! as SVGCircleElement;
    let transform = nodeTransforms.get(circle)!;
    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("10");
    expect(transform.tx).toBe(0);
    expect(transform.ty).toBe(10);

    controller.onHover(100);
    vi.runAllTimers();
    circle = svgEl.querySelector("circle")! as SVGCircleElement;
    transform = nodeTransforms.get(circle)!;
    expect(
      legend.querySelector(".chart-legend__green_value")!.textContent,
    ).toBe("30");
    expect(transform.tx).toBe(1);
    expect(transform.ty).toBe(30);
  });
});
