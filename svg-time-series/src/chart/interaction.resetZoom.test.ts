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
import type { IDataSource, IZoomStateOptions } from "../draw.ts";
import { LegendController } from "../../../samples/LegendController.ts";
import "../setupDom.ts";
import type { Matrix } from "../setupDom.ts";

const nodeTransforms = new Map<SVGGraphicsElement, Matrix>();
vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (node: SVGGraphicsElement, matrix: Matrix) => {
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
    setScale = vi.fn(() => this);
    axis = vi.fn();
    axisUp = vi.fn();
    ticks = vi.fn(() => this);
    setTickSize = vi.fn(() => this);
    setTickPadding = vi.fn(() => this);
  },
}));

let zoomReset: Mock;
let legendRefresh: Mock;
let zoomOptions: unknown;
let zoomSetScaleExtent: Mock;
vi.mock("../../../samples/LegendController.ts", () => ({
  LegendController: class {
    refresh = vi.fn();
    highlightIndex = vi.fn();
    clearHighlight = vi.fn();
    destroy = vi.fn();
    init = vi.fn();
    constructor() {
      legendRefresh = this.refresh;
    }
  },
}));
vi.mock("./zoomState.ts", () => ({
  ZoomState: class {
    private state: {
      axes: { y: Array<{ transform: { onZoomPan: (t: unknown) => void } }> };
    };
    private refreshChart: () => void;
    private zoomCallback: (e: unknown) => void;
    reset = vi.fn(() => {
      const identity = { x: 0, k: 1 };
      this.state.axes.y.forEach((a) => {
        a.transform.onZoomPan(identity);
      });
      this.refreshChart();
      this.zoomCallback({ transform: identity, sourceEvent: null });
    });
    refresh = vi.fn();
    destroy = vi.fn();
    zoom = vi.fn();
    setScaleExtent = vi.fn();
    constructor(
      _zoomArea: unknown,
      state: {
        axes: { y: Array<{ transform: { onZoomPan: (t: unknown) => void } }> };
      },
      refreshChart: () => void,
      zoomCallback: (e: unknown) => void,
      options?: unknown,
    ) {
      this.state = state;
      this.refreshChart = refreshChart;
      this.zoomCallback = zoomCallback;
      zoomReset = this.reset;
      zoomOptions = options;
      zoomSetScaleExtent = this.setScaleExtent;
    }
  },
}));

function createChart(
  data: Array<[number, number]>,
  options?: IZoomStateOptions,
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
    options,
  );

  return { interaction: chart.interaction };
}

beforeEach(() => {
  vi.useFakeTimers();
  nodeTransforms.clear();
  transformInstances.length = 0;
  zoomOptions = undefined;
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
    const transform = transformInstances[0]!;
    transform.onZoomPan.mockClear();

    interaction.resetZoom();
    vi.runAllTimers();

    expect(zoomReset).toHaveBeenCalled();
    expect(transform.onZoomPan).toHaveBeenCalledWith({ x: 0, k: 1 });
    expect(legendRefresh).toHaveBeenCalled();
  });
});

describe("interaction.setScaleExtent", () => {
  it("forwards extent to ZoomState", () => {
    const { interaction } = createChart([
      [10, 20],
      [30, 40],
    ]);
    const extent: [number, number] = [1, 100];
    interaction.setScaleExtent(extent);
    expect(zoomSetScaleExtent).toHaveBeenCalledWith(extent);
  });
});

describe("TimeSeriesChart zoom options", () => {
  it("forwards custom scale extents to ZoomState", () => {
    createChart(
      [
        [10, 20],
        [30, 40],
      ],
      { scaleExtent: [2, 80] },
    );
    expect(zoomOptions).toEqual({ scaleExtent: [2, 80] });
  });
});
