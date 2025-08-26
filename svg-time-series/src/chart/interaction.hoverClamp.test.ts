/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import type * as d3Zoom from "d3-zoom";
import { scaleLinear, type ScaleLinear } from "d3-scale";
import { TimeSeriesChart } from "../draw.ts";
import type { IDataSource } from "../draw.ts";
import { polyfillDom } from "../setupDom.ts";
await polyfillDom();
import type { ILegendController, LegendContext } from "./legend.ts";

vi.mock("../utils/domNodeTransform.ts", () => ({
  updateNode: (_node: SVGGraphicsElement, _matrix: DOMMatrix) => {},
}));

class MockViewportTransform {
  dataLength: number;
  constructor(dataLength: number) {
    this.dataLength = dataLength;
  }
  onZoomPan = vi.fn();
  scaleX: ScaleLinear<number, number> = scaleLinear();
  scaleY: ScaleLinear<number, number> = scaleLinear();
  matrix = new DOMMatrix();
  onViewPortResize = vi.fn();
  onReferenceViewWindowResize = vi.fn();
}
const ViewportTransform = vi.hoisted(() => vi.fn());
vi.mock("../ViewportTransform.ts", () => ({
  ViewportTransform,
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
        constrain: (
          fn?: unknown,
        ) => ZoomBehavior | ((...args: unknown[]) => unknown) | undefined;
        _constrain?: (
          t: unknown,
          extent: unknown,
          translateExtent: unknown,
        ) => unknown;
        transform: () => void;
      }
      const behavior = (() => {}) as ZoomBehavior;
      behavior.scaleExtent = () => behavior;
      behavior.translateExtent = () => behavior;
      behavior.on = () => behavior;
      behavior.constrain = (fn?: unknown) => {
        if (fn) {
          behavior._constrain = fn as (
            t: unknown,
            extent: unknown,
            translateExtent: unknown,
          ) => unknown;
          return behavior;
        }
        return behavior._constrain;
      };
      behavior.transform = () => {};
      return behavior;
    },
  };
});

class StubLegendController implements ILegendController {
  init = vi.fn((_: LegendContext) => {});
  highlightIndex = vi.fn();
  refresh = vi.fn();
  clearHighlight = vi.fn();
  destroy = vi.fn();
}

function createChart(data: Array<[number]>) {
  const parent = document.createElement("div");
  const w = Math.max(data.length - 1, 0);
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

  const source: IDataSource = {
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesAxes: [0],
    getSeries: (i) => data[i]![0],
  };
  const legendController = new StubLegendController();

  ViewportTransform.mockImplementation(
    () => new MockViewportTransform(data.length),
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

  return { onHover: chart.onHover, legendController };
}

beforeEach(() => {
  vi.useFakeTimers();
  ViewportTransform.mockReset();
});

afterEach(() => {
  vi.runAllTimers();
  vi.useRealTimers();
});

describe("TimeSeriesChart hover clamping", () => {
  it("clamps to first point when hovering before chart", () => {
    const { onHover, legendController } = createChart([[10], [20], [30]]);
    vi.runAllTimers();
    legendController.highlightIndex.mockClear();

    onHover(-100);
    vi.runAllTimers();

    expect(legendController.highlightIndex).toHaveBeenCalledWith(0);
  });

  it("clamps to last point when hovering past chart", () => {
    const { onHover, legendController } = createChart([[10], [20], [30]]);
    vi.runAllTimers();
    legendController.highlightIndex.mockClear();

    onHover(100);
    vi.runAllTimers();

    expect(legendController.highlightIndex).toHaveBeenCalledWith(2);
  });

  it("highlights nearest point for fractional positions", () => {
    const { onHover, legendController } = createChart([[10], [20], [30]]);
    vi.runAllTimers();
    legendController.highlightIndex.mockClear();

    onHover(1.4);
    vi.runAllTimers();
    expect(legendController.highlightIndex).toHaveBeenCalledWith(1);

    legendController.highlightIndex.mockClear();
    onHover(1.6);
    vi.runAllTimers();
    expect(legendController.highlightIndex).toHaveBeenCalledWith(2);
  });
});
