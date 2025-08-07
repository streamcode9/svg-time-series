/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { select, type Selection } from "d3-selection";
import { initPaths, renderPaths, lineNy, lineSf } from "./render/utils.ts";
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
        { path: nodes[0], line: lineNy },
        { path: nodes[1], line: lineSf },
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
    const svg = svgSelection.node()!;
    const { path } = initPaths(svgSelection, false);
    const nodes = path.nodes() as SVGPathElement[];
    const state = {
      series: [{ path: nodes[0], line: lineNy }],
    } as unknown as RenderState;
    const pathNode = nodes[0];
    const spy = vi.spyOn(pathNode, "setAttribute");

    renderPaths(state, [[0], [1]]);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(path.attr("d")).not.toBe("");
    expect(svg.querySelectorAll("path").length).toBe(1);

    spy.mockRestore();
  });
});

describe("initPaths", () => {
  it("creates only primary path when hasSf is false", () => {
    const svgSelection = select(document.createElement("div")).append(
      "svg",
    ) as unknown as Selection<SVGSVGElement, unknown, HTMLElement, unknown>;
    const { path, viewNy, viewSf } = initPaths(svgSelection, false);

    expect(path.size()).toBe(1);
    expect(viewNy.tagName).toBe("g");
    expect(viewSf).toBeUndefined();
  });
});
