import { csv } from "d3-fetch";
import type { ValueFn } from "d3-selection";
import { select, selectAll, pointer } from "d3-selection";
import type { D3ZoomEvent } from "d3-zoom";
import { zoomIdentity } from "d3-zoom";

import type { IDataSource } from "svg-time-series";
import { TimeSeriesChart } from "svg-time-series";
import { LegendController } from "../LegendController.ts";
import { measure } from "../measure.ts";

export function drawCharts(
  data: [number, number][],
  seriesAxes: number[] = [0, 0],
): TimeSeriesChart[] {
  const charts: TimeSeriesChart[] = [];

  const onZoom = (
    sourceChart: TimeSeriesChart,
    event: D3ZoomEvent<SVGRectElement, unknown>,
  ) => {
    if (!event.sourceEvent) return;
    charts.forEach((c) => {
      if (c !== sourceChart) {
        c.interaction.zoom({
          ...event,
          sourceEvent: null,
          transform: zoomIdentity
            .translate(event.transform.x, event.transform.y)
            .scale(event.transform.k),
        });
      }
    });
  };
  const onMouseMove: (this: Element, event: MouseEvent) => void = function (
    this: Element,
    event: MouseEvent,
  ) {
    const [x] = pointer(event, this);
    charts.forEach((c) => {
      c.interaction.onHover(x);
    });
  };

  const onSelectChart: ValueFn<HTMLElement, unknown, void> = function () {
    const svg = select(this).select<SVGSVGElement>("svg");
    const legend = select(this).select<HTMLElement>(".chart-legend");
    const source: IDataSource = {
      startTime: Date.now(),
      timeStep: 86400000,
      length: data.length,
      seriesAxes,
      getSeries: (i, seriesIdx) => data[i][seriesIdx],
    };
    const legendController = new LegendController(legend);
    const chart = new TimeSeriesChart(
      svg,
      source,
      legendController,
      undefined,
      onMouseMove,
    );
    charts.push(chart);
    chart.interaction.on(
      "afterZoom",
      (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        onZoom(chart, event);
        console.log("Zoom transform:", chart.interaction.getZoomTransform());
      },
    );
    chart.interaction.on("brushEnd", (timeWindow) => {
      console.log("Brushed window:", timeWindow);
    });
  };

  selectAll(".chart").each(onSelectChart);
  measure(3, ({ fps }) => {
    document.getElementById("fps").textContent = fps.toFixed(2);
  });

  return charts;
}

export async function onCsv(): Promise<[number, number][]> {
  try {
    const rows = (await csv("./ny-vs-sf.csv")) as { NY: string; SF: string }[];
    return rows.map(({ NY, SF }) => [
      parseFloat(NY.split(";")[0]),
      parseFloat(SF.split(";")[0]),
    ]);
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }
}

interface Resize {
  interval: number;
  request: (() => void) | null;
  timer: ReturnType<typeof setTimeout> | null;
  eval: (() => void) | null;
}

const resize: Resize = { interval: 60, request: null, timer: null, eval: null };

let intervalId: ReturnType<typeof setInterval> | null = null;
let resizeListener: (() => void) | null = null;

export async function loadAndDraw(
  seriesAxes: number[] = [0, 0],
): Promise<TimeSeriesChart[]> {
  const data = await onCsv();
  let charts = drawCharts(data, seriesAxes);

  if (intervalId) {
    clearInterval(intervalId);
  }
  let j = 0;
  intervalId = setInterval(function () {
    const newData = data[j % data.length];
    charts.forEach((c) => {
      c.updateChartWithNewData([newData[0], newData[1]]);
    });
    j++;
  }, 5000);

  resize.request = function () {
    if (resize.timer) clearTimeout(resize.timer);
    resize.timer = setTimeout(() => {
      resize.eval?.();
    }, resize.interval);
  };
  resize.eval = function () {
    selectAll("svg").remove();
    selectAll(".chart-drawing").append("svg");
    charts = drawCharts(data, seriesAxes);
  };

  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
  }
  resizeListener = () => resize.request?.();
  window.addEventListener("resize", resizeListener);

  return charts;
}

export async function initDemo(
  seriesAxes: number[],
): Promise<TimeSeriesChart[] | undefined> {
  try {
    const charts = await loadAndDraw(seriesAxes);
    charts.forEach((c) => {
      c.interaction.onHover(0);
    });
    select("#reset-zoom").on("click.resetZoom", () => {
      charts.forEach((c) => {
        c.interaction.resetZoom();
      });
    });

    const brushButton = select<HTMLButtonElement, unknown>("#toggle-brush");
    if (!brushButton.empty()) {
      let brushEnabled = false;
      brushButton.on("click.toggleBrush", () => {
        brushEnabled = !brushEnabled;
        charts.forEach((c) => {
          if (brushEnabled) {
            c.interaction.enableBrush();
          } else {
            c.interaction.disableBrush();
          }
        });
        brushButton.text(brushEnabled ? "Disable Brush" : "Enable Brush");
      });
    }

    let disposed = false;
    const disposeAll = () => {
      if (!disposed) {
        disposed = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        if (resizeListener) {
          window.removeEventListener("resize", resizeListener);
          resizeListener = null;
        }
        select("#reset-zoom").on("click.resetZoom", null);
        select("#toggle-brush").on("click.toggleBrush", null);
      }
    };
    charts.forEach((c) => {
      const originalDispose = c.interaction.dispose;
      c.interaction.dispose = () => {
        disposeAll();
        originalDispose();
      };
    });

    return charts;
  } catch {
    alert("Data can't be downloaded or parsed");
    return undefined;
  }
}
