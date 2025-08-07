/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { select } from "d3-selection";
import { renderPaths } from "./render/utils.ts";
import type { RenderState } from "./render.ts";

describe("renderPaths", () => {
  it("skips segments for NaN values", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const pathSelection = select(svg)
      .selectAll("path")
      .data([0, 1])
      .enter()
      .append("path");

    const state = { paths: { path: pathSelection } } as unknown as RenderState;
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
});
