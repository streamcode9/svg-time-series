/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { scaleTime } from "d3-scale";
import { zoomIdentity } from "d3-zoom";
import { AR1Basis } from "../math/affine.ts";
import { ChartData } from "./data.ts";
import type { IDataSource } from "./data.ts";
import { createDimensions, updateScaleX } from "./render/utils.ts";

describe("createDimensions", () => {
  it("sets width and height and returns screen basis", () => {
    const width = 400;
    const height = 300;
    const div = document.createElement("div");
    Object.defineProperty(div, "clientWidth", { value: width });
    Object.defineProperty(div, "clientHeight", { value: height });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    div.appendChild(svg);
    const selection = select(svg) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >;
    const dp = createDimensions(selection);

    expect(svg.getAttribute("width")).toBe(String(width));
    expect(svg.getAttribute("height")).toBe(String(height));
    expect(dp.x().toArr()).toEqual([0, width]);
    expect(dp.y().toArr()).toEqual([height, 0]);
  });

  it("throws when SVG lacks a parent", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const selection = select(svg) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >;
    expect(() => createDimensions(selection)).toThrow(/HTMLElement parent/);
  });

  it("throws when parent is not an HTMLElement", () => {
    const frag = document.createDocumentFragment();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    frag.appendChild(svg);
    const selection = select(svg) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >;
    expect(() => createDimensions(selection)).toThrow(/HTMLElement parent/);
  });
});

describe("updateScaleX", () => {
  it("adjusts domain based on zoom transform", () => {
    const x = scaleTime()
      .domain([new Date(0), new Date(2)])
      .range([0, 100]);
    updateScaleX(x, zoomIdentity);
    const [d0, d1] = x.domain();
    expect(d0!.getTime()).toBe(0);
    expect(d1!.getTime()).toBe(2);
  });
});

describe("updateScaleY", () => {
  const makeSource = (data: number[][]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesAxes: [0],
    getSeries: (i) => data[i]![0]!,
  });

  it("respects the supplied index window", () => {
    const cd = new ChartData(makeSource([[10], [20], [40], [5]]));
    const tree = cd.buildAxisTree(0);
    const dp = cd.updateScaleY(new AR1Basis(1, 2), tree);
    expect(dp.x().toArr()).toEqual([1, 2]);
    expect(dp.y().toArr()).toEqual([20, 40]);
  });
});
