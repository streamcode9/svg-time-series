import type { Series } from "./render.ts";

export class SeriesRenderer {
  /** Ordered collection of series to render. */
  public series: Series[] = [];

  /** Cache of the last rendered `d` attribute for each series. */
  private readonly lastD = new WeakMap<Series, string>();

  public draw(dataArr: number[][]): void {
    for (const s of this.series) {
      const d = s.line(dataArr) ?? "";
      if (this.lastD.get(s) !== d) {
        s.path.setAttribute("d", d);
        this.lastD.set(s, d);
      }
    }
  }
}
