/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select } from "d3-selection";

import type { Line } from "d3-shape";
import { SeriesRenderer } from "../../src/chart/seriesRenderer.ts";
import type { Series } from "../../src/chart/render.ts";

describe("SeriesRenderer", () => {
  it("sets each path d attribute from line generator output", () => {
    const renderer = new SeriesRenderer();
    const data: number[][] = [
      [0, 1],
      [2, 3],
    ];

    const makeSeries = (id: string): Series => {
      const pathNode = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const viewNode = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      const path = select(pathNode);
      const view = select(viewNode);
      const line = ((arr: number[][]) =>
        `${id}:${arr.map((p) => p.join(",")).join(";")}`) as unknown as Line<
        number[]
      >;
      return { axisIdx: 0, path, view, line };
    };

    const series = [makeSeries("a"), makeSeries("b")];
    renderer.series = series;

    renderer.draw(data);

    expect(series[0]!.path.attr("d")).toBe("a:0,1;2,3");
    expect(series[1]!.path.attr("d")).toBe("b:0,1;2,3");
  });

  it("falls back to empty string for empty data", () => {
    const renderer = new SeriesRenderer();
    const pathNode = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    const viewNode = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const path = select(pathNode);
    const view = select(viewNode);
    const line = ((arr: number[][]) =>
      arr.length ? "filled" : undefined) as unknown as Line<number[]>;

    const series: Series = { axisIdx: 0, path, view, line };
    renderer.series = [series];

    renderer.draw([]);

    expect(path.attr("d")).toBe("");
  });

  it("skips DOM updates when data is unchanged", () => {
    const renderer = new SeriesRenderer();
    const data: number[][] = [
      [0, 1],
      [2, 3],
    ];

    const pathNode = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    const viewNode = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const path = select(pathNode);
    const view = select(viewNode);
    const line = (() => "same") as unknown as Line<number[]>;

    const series: Series = { axisIdx: 0, path, view, line };
    renderer.series = [series];

    const spy = vi.spyOn(pathNode, "setAttribute");

    renderer.draw(data);
    renderer.draw(data);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
