/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select, type Selection } from "d3-selection";
import { initSeriesNode, renderPaths, createLine } from "./render/utils.ts";
import type { RenderState } from "./render.ts";

describe("renderPaths", () => {
  it("skips segments for NaN values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const pathSelection = select(svg)
      .selectAll("path")
      .data([0, 1])
      .enter()
      .append("path");
    const nodes = pathSelection.nodes() as SVGPathElement[];
    const state = {
      series: [
        { path: nodes[0], line: createLine(0) },
        { path: nodes[1], line: createLine(1) },
      ],
    } as unknown as RenderState;
    const data: Array<[number, number]> = [
      [0, 0],
      [NaN, NaN],
      [2, 2],
    ];

    renderPaths(state, data);

    const d = pathSelection.attr("d");
    expect(d).not.toContain("1,");
    expect(d.match(/M/g)?.length).toBe(2);
  });

  it("only updates primary path when hasSf is false", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    const svg = svgSelection.node() as SVGSVGElement;
    const { path } = initSeriesNode(svgSelection);
    const state = {
      series: [{ path, line: createLine(0) }],
    } as unknown as RenderState;
    const pathNode = path;
    const spy = vi.spyOn(pathNode, "setAttribute");

    renderPaths(state, [[0], [1]]);

    expect(spy).toHaveBeenCalledTimes(state.series.length);
    expect(path.getAttribute("d")).not.toBe("");
    expect(svg.querySelectorAll("path").length).toBe(1);

    spy.mockRestore();
  });
});

describe("initSeriesNode", () => {
  it("creates a view and path", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    const { view, path } = initSeriesNode(svgSelection);

    expect(view.tagName).toBe("g");
    expect(path.tagName).toBe("path");
  });
});
