/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select, type Selection } from "d3-selection";
import { SeriesRenderer } from "./seriesRenderer.ts";
import { SeriesManager } from "./series.ts";

describe("SeriesRenderer", () => {
  describe("draw", () => {
    it("skips segments for NaN values", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const renderer = new SeriesRenderer();
      const manager = new SeriesManager(
        select(svg) as unknown as Selection<
          SVGSVGElement,
          unknown,
          HTMLElement,
          unknown
        >,
        [0, 1],
      );
      renderer.series = manager.series;
      const data: Array<[number, number]> = [
        [0, 0],
        [NaN, NaN],
        [2, 2],
      ];

      renderer.draw(data);

      const d = select(renderer.series[0].path).attr("d");
      expect(d).not.toContain("NaN");
      expect(d.match(/M/g)?.length).toBe(2);
    });

    it("only updates primary path when hasSf is false", () => {
      const svgSelection = select(document.createElement("div")).append(
        "svg",
      ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
      const renderer = new SeriesRenderer();
      const manager = new SeriesManager(svgSelection, [0]);
      const [series] = manager.series;
      renderer.series = manager.series;
      const pathNode = series.path;
      const spy = vi.spyOn(pathNode, "setAttribute");

      renderer.draw([[0], [1]]);

      expect(spy).toHaveBeenCalledTimes(renderer.series.length);
      expect(pathNode.getAttribute("d")).not.toBe("");
      expect(svgSelection.selectAll("path").nodes().length).toBe(1);

      spy.mockRestore();
    });
  });
});

describe("SeriesManager", () => {
  it("creates a view and path", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    const manager = new SeriesManager(svgSelection, [0]);
    const [series] = manager.series;

    expect(series.view.tagName).toBe("g");
    expect(series.path.tagName).toBe("path");
  });

  it("throws when a series axis is undefined", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    expect(
      () => new SeriesManager(svgSelection, [undefined as unknown as number]),
    ).toThrow(/seriesAxes\[0\]/);
  });
});
