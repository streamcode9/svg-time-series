import type { Series } from "./render.ts";

export class SeriesRenderer {
  public series: Series[] = [];

  public draw(dataArr: number[][]): void {
    for (const s of this.series) {
      if (s.path) {
        s.path.setAttribute("d", s.line(dataArr) ?? "");
      }
    }
  }
}
