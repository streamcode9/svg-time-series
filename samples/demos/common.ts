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

let intervalId: ReturnType<typeof setInterval> | null = null;
let resizeObservers: ResizeObserver[] = [];

function setupResizeObservers(charts: TimeSeriesChart[]): void {
  resizeObservers.forEach((o) => {
    o.disconnect();
  });
  resizeObservers = [];
  selectAll<HTMLElement, unknown>(".chart-drawing").each(function (
    this: HTMLElement,
    _,
    i,
  ) {
    const chart = charts[i]!;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0]!.contentRect;
      chart.resize({ width, height });
    });
    observer.observe(this);
    resizeObservers.push(observer);
  });
}

export async function loadAndDraw(
  seriesAxes: number[] = [0, 0],
): Promise<TimeSeriesChart[]> {
  const data = await onCsv();
  const charts = drawCharts(data, seriesAxes);

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

  setupResizeObservers(charts);

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
    const resetButton = document.getElementById("reset-zoom");
    let resetHandler: (() => void) | null = null;
    resetHandler = () => {
      charts.forEach((c) => {
        c.interaction.resetZoom();
      });
    };
    resetButton?.addEventListener("click", resetHandler);

    const brushButton = document.getElementById("toggle-brush");
    let brushHandler: (() => void) | null = null;
    if (brushButton) {
      let brushEnabled = false;
      brushHandler = () => {
        brushEnabled = !brushEnabled;
        charts.forEach((c) => {
          if (brushEnabled) {
            c.interaction.enableBrush();
          } else {
            c.interaction.disableBrush();
          }
        });
        brushButton.textContent = brushEnabled
          ? "Disable Brush"
          : "Enable Brush";
      };
      brushButton.addEventListener("click", brushHandler);
    }

    let disposed = false;
    const disposeAll = () => {
      if (!disposed) {
        disposed = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        resizeObservers.forEach((o) => {
          o.disconnect();
        });
        resizeObservers = [];
        if (resetButton && resetHandler) {
          resetButton.removeEventListener("click", resetHandler);
          resetHandler = null;
        }
        if (brushButton && brushHandler) {
          brushButton.removeEventListener("click", brushHandler);
          brushHandler = null;
        }
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
