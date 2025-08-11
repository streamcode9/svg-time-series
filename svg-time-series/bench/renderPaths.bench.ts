/**
 * @vitest-environment jsdom
 */
import { bench, describe } from "vitest";
import { select } from "d3-selection";
import { SeriesRenderer } from "../src/chart/seriesRenderer.ts";
import { createSeries } from "../src/chart/series.ts";
import { sizes, datasets } from "./timeSeriesData.ts";

describe("renderPaths performance", () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const renderer = new SeriesRenderer();
  renderer.series = createSeries(select(svg), [0, 1]);

  sizes.forEach((size, idx) => {
    const data = datasets[idx];
    bench(`size ${String(size)}`, () => {
      renderer.draw(data);
    });
  });
});
