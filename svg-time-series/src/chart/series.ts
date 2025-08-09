import { Selection } from "d3-selection";
import { line, type Line } from "d3-shape";

import type { Series } from "./render.ts";
import { createSeriesNodes } from "./render/utils.ts";

export class SeriesManager {
  public readonly series: Series[];

  constructor(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    seriesAxes: number[],
  ) {
    this.series = seriesAxes.map((axisIdx, i) => {
      if (axisIdx == null) {
        throw new Error(
          `SeriesManager requires seriesAxes[${i}] to be defined`,
        );
      }
      const { view, path } = createSeriesNodes(svg);
      return { axisIdx, view, path, line: this.createLine(i) };
    });
  }

  private createLine(seriesIdx: number): Line<number[]> {
    return line<number[]>()
      .defined((d) => !(isNaN(d[seriesIdx]) || d[seriesIdx] == null))
      .x((_, i) => i)
      .y((d) => d[seriesIdx] as number);
  }
}
