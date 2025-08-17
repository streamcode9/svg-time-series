/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";

import type { Line } from "d3-shape";
import { SeriesRenderer } from "./seriesRenderer.ts";
import type { Series } from "./render.ts";

describe("SeriesRenderer", () => {
  it("sets each path d attribute from line generator output", () => {
    const renderer = new SeriesRenderer();
    const data: number[][] = [
      [0, 1],
      [2, 3],
    ];

    const makeSeries = (id: string): Series => {
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const view = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const line = ((arr: number[][]) =>
        `${id}:${arr.map((p) => p.join(",")).join(";")}`) as unknown as Line<
        number[]
      >;
      return { axisIdx: 0, path, view, line };
    };

    const series = [makeSeries("a"), makeSeries("b")];
    renderer.series = series;

    renderer.draw(data);

    expect(series[0]!.path.getAttribute("d")).toBe("a:0,1;2,3");
    expect(series[1]!.path.getAttribute("d")).toBe("b:0,1;2,3");
  });

  it("falls back to empty string for empty data", () => {
    const renderer = new SeriesRenderer();
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const view = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const line = ((arr: number[][]) =>
      arr.length ? "filled" : undefined) as unknown as Line<number[]>;

    const series: Series = { axisIdx: 0, path, view, line };
    renderer.series = [series];

    renderer.draw([]);

    expect(path.getAttribute("d")).toBe("");
  });

  it("skips DOM updates when data is unchanged", () => {
    const renderer = new SeriesRenderer();
    const data: number[][] = [
      [0, 1],
      [2, 3],
    ];

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const view = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const line = (() => "same") as unknown as Line<number[]>;

    const series: Series = { axisIdx: 0, path, view, line };
    renderer.series = [series];

    const spy = vi.spyOn(path, "setAttribute");

    renderer.draw(data);
    renderer.draw(data);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
