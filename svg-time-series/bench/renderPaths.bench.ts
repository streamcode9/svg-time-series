/**
 * @vitest-environment jsdom
 */
import { bench, describe } from "vitest";
import { select } from "d3-selection";
import { renderPaths } from "../src/chart/render/utils.ts";
import type { RenderState } from "../src/chart/render.ts";
import { sizes, datasets } from "./timeSeriesData.ts";

describe("renderPaths performance", () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const pathSelection = select(svg)
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path");

  const state = { paths: { path: pathSelection } } as unknown as RenderState;

  sizes.forEach((size, idx) => {
    const data = datasets[idx];
    bench(`size ${size}`, () => {
      renderPaths(state, data);
    });
  });
});
