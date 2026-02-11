import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { line, type Line } from "d3-shape";

import type { Series } from "./render.ts";

function createLine(seriesIdx: number): Line<number[]> {
  return line<number[]>()
    .defined((d) => !Number.isNaN(d[seriesIdx]!))
    .x((_, i) => i)
    .y((d) => d[seriesIdx]!);
}

interface SeriesConfig {
  id: string;
  axisIdx: number;
  seriesIdx: number;
}

/**
 * Creates or updates series using D3's general update pattern (enter/update/exit).
 * This enables dynamic addition/removal of series at runtime.
 *
 * @param svg - The SVG selection to render series into
 * @param seriesAxes - Array mapping each series index to its Y-axis index (0 or 1)
 * @returns Array of Series objects with D3 selections and line generators
 */
export function createSeries(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  seriesAxes: number[],
): Series[] {
  // Create series configuration with unique IDs
  const seriesConfig: SeriesConfig[] = seriesAxes.map((axisIdx, i) => ({
    id: `series-${String(i)}`,
    axisIdx,
    seriesIdx: i,
  }));

  // D3 General Update Pattern: data join with key function for object constancy
  const views = svg
    .selectAll<SVGGElement, SeriesConfig>("g.view")
    .data(seriesConfig, (d) => d.id);

  // EXIT: Remove old series that are no longer in the data
  views.exit().remove();

  // ENTER: Create new series elements
  const enter = views.enter().append("g").attr("class", "view");

  // Append path element to each new series group
  enter.append("path");

  // UPDATE + ENTER: Merge existing and new selections
  const merged = views.merge(enter);

  // Build Series array with D3 selections and line generators
  return merged.nodes().map((viewNode, i) => {
    const config = seriesConfig[i]!;
    const viewSelection = select<SVGGElement, unknown>(
      viewNode,
    ) as unknown as Selection<SVGGElement, unknown, HTMLElement, unknown>;
    const pathSelection = viewSelection.select<SVGPathElement>("path");

    return {
      id: config.id,
      axisIdx: config.axisIdx,
      viewSelection,
      pathSelection,
      line: createLine(config.seriesIdx),
    };
  });
}
