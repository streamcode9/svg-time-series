import type { Selection } from "d3-selection";
import { line, type Line } from "d3-shape";

import type { Series } from "./render.ts";
import { createSeriesNodes } from "./render/utils.ts";

function createLine(seriesIdx: number): Line<number[]> {
  return line<number[]>()
    .defined((d) => !isNaN(d[seriesIdx]!))
    .x((_, i) => i)
    .y((d) => d[seriesIdx]!);
}

export function createSeries(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  seriesAxes: number[],
): Series[] {
  return seriesAxes.map((axisIdx, i) => {
    const { view, path } = createSeriesNodes(svg);
    return { axisIdx, view, path, line: createLine(i) };
  });
}
