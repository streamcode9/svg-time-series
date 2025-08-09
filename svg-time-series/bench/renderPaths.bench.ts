/**
 * @vitest-environment jsdom
 */
import { bench, describe } from "vitest";
import { select } from "d3-selection";
import { SeriesRenderer } from "../src/chart/seriesRenderer.ts";
import { sizes, datasets } from "./timeSeriesData.ts";

describe("renderPaths performance", () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const renderer = new SeriesRenderer();
  renderer.init(select(svg), 2, [0, 1]);

  sizes.forEach((size, idx) => {
    const data = datasets[idx];
    bench(`size ${size}`, () => {
      renderer.draw(data);
    });
  });
});
