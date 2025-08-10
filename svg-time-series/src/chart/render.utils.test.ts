/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { AR1Basis } from "../math/affine.ts";
import { ChartData } from "./data.ts";
import type { IDataSource } from "./data.ts";
import { buildAxisTree } from "./axisManager.ts";
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
  const makeSource = (data: number[][]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: 1,
    seriesAxes: [0],
    getSeries: (i) => data[i][0],
  });

  it("adjusts domain based on visible index range", () => {
    const cd = new ChartData(makeSource([[0], [1], [2]]));
    const x = scaleTime().range([0, 100]);
    updateScaleX(x, new AR1Basis(0, 2), cd);
    const [d0, d1] = x.domain();
    expect(d0.getTime()).toBe(0);
    expect(d1.getTime()).toBe(2);
  });
});

describe("updateScaleY", () => {
  const makeSource = (data: number[][]): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: 1,
    seriesAxes: [0],
    getSeries: (i) => data[i][0],
  });

  it("sets domain from visible data bounds", () => {
    const cd = new ChartData(makeSource([[10], [20], [40]]));
    const y = scaleLinear().range([100, 0]);
    const tree = buildAxisTree(cd, 0);
    const dp = cd.updateScaleY(new AR1Basis(0, 2), tree);
    expect(dp.y().toArr()).toEqual([10, 40]);
    y.domain(dp.y().toArr());
    expect(y.domain()).toEqual([10, 40]);
  });
});
