import { Selection } from "d3-selection";
import { line, type Line } from "d3-shape";
import type { Series } from "./render.ts";

interface SeriesNode {
  view: SVGGElement;
  path: SVGPathElement;
}

export class SeriesRenderer {
  public series: Series[] = [];

  public init(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
    seriesCount: number,
    seriesAxes: number[],
  ): Series[] {
    const series: Series[] = [];
    for (let i = 0; i < seriesCount; i++) {
      const { view, path } = this.initSeriesNode(svg);
      const axisIdx = seriesAxes[i] ?? 0;
      series.push({ axisIdx, view, path, line: this.createLine(i) });
    }
    this.series = series;
    return series;
  }

  public draw(dataArr: number[][]): void {
    for (const s of this.series) {
      if (s.path) {
        s.path.setAttribute("d", s.line(dataArr) ?? "");
      }
    }
  }

  private createLine(seriesIdx: number): Line<number[]> {
    return line<number[]>()
      .defined((d) => !(isNaN(d[seriesIdx]) || d[seriesIdx] == null))
      .x((_, i) => i)
      .y((d) => d[seriesIdx] as number);
  }

  private initSeriesNode(
    svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown>,
  ): SeriesNode {
    const view = svg.append("g").attr("class", "view");
    const path = view.append<SVGPathElement>("path").node() as SVGPathElement;
    return { view: view.node() as SVGGElement, path };
  }
}
