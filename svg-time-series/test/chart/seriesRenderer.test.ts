/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select } from "d3-selection";
import type { Selection } from "d3-selection";

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
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const view = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const line = ((arr: number[][]) =>
        `${id}:${arr.map((p) => p.join(",")).join(";")}`) as unknown as Line<
        number[]
      >;
      return {
        id,
        axisIdx: 0,
        pathSelection: select(path) as unknown as Selection<
          SVGPathElement,
          unknown,
          HTMLElement,
          unknown
        >,
        viewSelection: select(view) as unknown as Selection<
          SVGGElement,
          unknown,
          HTMLElement,
          unknown
        >,
        line,
      };
    };

    const series = [makeSeries("a"), makeSeries("b")];
    renderer.series = series;

    renderer.draw(data);

    expect(series[0]!.pathSelection.attr("d")).toBe("a:0,1;2,3");
    expect(series[1]!.pathSelection.attr("d")).toBe("b:0,1;2,3");
  });

  it("falls back to empty string for empty data", () => {
    const renderer = new SeriesRenderer();
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const view = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const line = ((arr: number[][]) =>
      arr.length ? "filled" : undefined) as unknown as Line<number[]>;

    const series: Series = {
      id: "test",
      axisIdx: 0,
      pathSelection: select(path) as unknown as Selection<
        SVGPathElement,
        unknown,
        HTMLElement,
        unknown
      >,
      viewSelection: select(view) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
      line,
    };
    renderer.series = [series];

    renderer.draw([]);

    expect(series.pathSelection.attr("d")).toBe("");
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

    const series: Series = {
      id: "test",
      axisIdx: 0,
      pathSelection: select(path) as unknown as Selection<
        SVGPathElement,
        unknown,
        HTMLElement,
        unknown
      >,
      viewSelection: select(view) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
      line,
    };
    renderer.series = [series];

    const spy = vi.spyOn(series.pathSelection, "attr");

    renderer.draw(data);
    renderer.draw(data);

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
