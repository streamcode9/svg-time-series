/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { SeriesRenderer } from "../../src/chart/seriesRenderer.ts";
import { createSeries } from "../../src/chart/series.ts";

describe("SeriesRenderer", () => {
  describe("draw", () => {
    it("skips segments for NaN values", () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const renderer = new SeriesRenderer();
      renderer.series = createSeries(
        select(svg) as unknown as Selection<
          SVGSVGElement,
          unknown,
          HTMLElement,
          unknown
        >,
        [0, 1],
      );
      const data: Array<[number, number]> = [
        [0, 0],
        [NaN, NaN],
        [2, 2],
      ];

      renderer.draw(data);

      const d = renderer.series[0]!.pathSelection.attr("d");
      expect(d).not.toContain("NaN");
      expect(d.match(/M/g)?.length).toBe(2);
    });

    it("only updates primary path when hasSf is false", () => {
      const svgSelection = select(document.createElement("div")).append(
        "svg",
      ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
      const renderer = new SeriesRenderer();
      const seriesList = createSeries(svgSelection, [0]);
      const [series] = seriesList;
      renderer.series = seriesList;
      const spy = vi.spyOn(series!.pathSelection, "attr");

      renderer.draw([[0], [1]]);

      expect(spy).toHaveBeenCalledWith("d", expect.any(String));
      expect(series!.pathSelection.attr("d")).not.toBe("");
      expect(svgSelection.selectAll("path").nodes().length).toBe(1);

      spy.mockRestore();
    });
  });
});

describe("createSeries", () => {
  it("creates a view and path", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    const [series] = createSeries(svgSelection, [0]);

    expect(series!.viewSelection.node()?.tagName).toBe("g");
    expect(series!.pathSelection.node()?.tagName).toBe("path");
    expect(series!.id).toBe("series-0");
    expect(series!.axisIdx).toBe(0);
  });
});
