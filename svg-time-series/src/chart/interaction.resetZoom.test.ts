/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { select } from "d3-selection";
import { AR1Basis } from "../math/affine.ts";
import { TimeSeriesChart, IDataSource } from "../draw.ts";
import { LegendController } from "../../../samples/LegendController.ts";

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
vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (node: SVGGraphicsElement, matrix: Matrix) => {
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
    onViewPortResize = vi.fn();
    onReferenceViewWindowResize = vi.fn();
  },
}));

vi.mock("../axis.ts", () => ({
  Orientation: { Bottom: 0, Right: 1 },
  MyAxis: class {
    constructor() {}
    setScale = vi.fn(() => this);
    axis = vi.fn();
    axisUp = vi.fn();
    ticks = vi.fn(() => this);
    setTickSize = vi.fn(() => this);
    setTickPadding = vi.fn(() => this);
  },
}));

let zoomReset: any;
let legendRefresh: any;
vi.mock("../../../samples/LegendController.ts", () => ({
  LegendController: class {
    refresh = vi.fn();
    onHover = vi.fn();
    destroy = vi.fn();
    constructor() {
      legendRefresh = this.refresh;
    }
  },
}));
vi.mock("./zoomState.ts", () => ({
  ZoomState: class {
    private state: any;
    private refreshChart: () => void;
    private zoomCallback: (e: any) => void;
    reset = vi.fn(() => {
      const identity = { x: 0, k: 1 };
      this.state.transforms.ny.onZoomPan(identity);
      this.state.transforms.sf?.onZoomPan(identity);
      this.refreshChart();
      this.zoomCallback({ transform: identity, sourceEvent: null });
    });
    refresh = vi.fn();
    destroy = vi.fn();
    zoom = vi.fn();
    constructor(
      _zoomArea: any,
      state: any,
      refreshChart: () => void,
      zoomCallback: (e: any) => void,
    ) {
      this.state = state;
      this.refreshChart = refreshChart;
      this.zoomCallback = zoomCallback;
      zoomReset = this.reset;
    }
  },
}));

function createChart(data: Array<[number, number]>) {
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
    getSeries: (i, seriesIdx) => data[i][seriesIdx],
  };
  const chart = new TimeSeriesChart(
    select(svgEl) as any,
    source,
    (state, chartData) =>
      new LegendController(select(legend) as any, state, chartData),
    true,
    () => {},
    () => {},
  );

  return { interaction: chart.interaction };
}

beforeEach(() => {
  vi.useFakeTimers();
  nodeTransforms.clear();
  transformInstances.length = 0;
  (SVGSVGElement.prototype as any).createSVGMatrix = () => new Matrix();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe("interaction.resetZoom", () => {
  it("resets transform and refreshes legend", () => {
    const { interaction } = createChart([
      [10, 20],
      [30, 40],
    ]);
    vi.runAllTimers();
    legendRefresh.mockClear();
    const transform = transformInstances[0];
    transform.onZoomPan.mockClear();

    interaction.resetZoom();
    vi.runAllTimers();

    expect(zoomReset).toHaveBeenCalled();
    expect(transform.onZoomPan).toHaveBeenCalledWith({ x: 0, k: 1 });
    expect(legendRefresh).toHaveBeenCalled();
  });
});
