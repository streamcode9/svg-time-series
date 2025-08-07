import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { select } from "d3-selection";

let drawNewDataMock: ReturnType<typeof vi.fn>;
let onHoverMock: ReturnType<typeof vi.fn>;
let onHoverUsedData: Array<[number, number?]> | null;
// eslint-disable-next-line no-var
var ChartInteractionMock: ReturnType<typeof vi.fn>;

vi.mock("./chart/render.ts", () => ({
  setupRender: vi.fn(() => ({
    dimensions: { width: 100, height: 100 },
  })),
}));

vi.mock("./chart/interaction.ts", () => {
  ChartInteractionMock = vi.fn(
    (
      _svg: unknown,
      _legend: unknown,
      _state: unknown,
      data: { data: Array<[number, number?]> },
    ) => {
      drawNewDataMock = vi.fn();
      onHoverMock = vi.fn(() => {
        onHoverUsedData = data.data.slice();
      });
      return {
        zoom: vi.fn(),
        onHover: onHoverMock,
        drawNewData: drawNewDataMock,
        destroy: vi.fn(),
      };
    },
  );
  return { ChartInteraction: ChartInteractionMock };
});

import { TimeSeriesChart } from "./draw.ts";
import { ChartData } from "./chart/data.ts";

const appendSpy = vi.spyOn(ChartData.prototype, "append");

function createChart(initialData: Array<[number, number?]>) {
  const dom = new JSDOM(
    `<body>
      <svg></svg>
      <div id="legend">
        <span class="chart-legend__time"></span>
        <span class="chart-legend__green_value"></span>
        <span class="chart-legend__blue_value"></span>
      </div>
    </body>`,
  );
  const svgSel = select(dom.window.document.querySelector("svg")) as any;
  const legendSel = select(dom.window.document.querySelector("#legend")) as any;

  const buildTuple = () => ({ min: 0, max: 0 });

  const chart = new TimeSeriesChart(
    svgSel,
    legendSel,
    0,
    1,
    initialData,
    buildTuple,
    buildTuple,
    false,
    vi.fn(),
    vi.fn(),
  );

  appendSpy.mockClear();
  drawNewDataMock.mockClear();
  onHoverMock.mockClear();
  onHoverUsedData = null;

  return chart;
}

describe("TimeSeriesChart", () => {
  it("calls append and drawNewData on update", () => {
    const chart = createChart([
      [0, 0],
      [1, 1],
    ]);

    chart.updateChartWithNewData([2, 2]);

    expect(appendSpy).toHaveBeenCalledWith([2, 2]);
    expect(drawNewDataMock).toHaveBeenCalled();
  });

  it("onHover uses updated dataset", () => {
    const chart = createChart([
      [0, 0],
      [1, 1],
    ]);

    chart.updateChartWithNewData([2, 2]);
    chart.interaction.onHover(0);

    expect(onHoverUsedData).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });
});
