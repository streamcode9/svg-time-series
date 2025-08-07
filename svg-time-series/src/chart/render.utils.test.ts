/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { select, Selection } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { AR1Basis } from "../math/affine.ts";
import { ChartData, IDataSource } from "./data.ts";
import type { ViewportTransform } from "../ViewportTransform.ts";
import { vi } from "vitest";
import {
  createDimensions,
  createScales,
  updateScaleX,
  updateScaleY,
  initPaths,
} from "./render/utils.ts";

describe("createDimensions", () => {
  it("propagates width and height and returns bases", () => {
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
    const {
      width: w,
      height: h,
      bScreenXVisible,
      bScreenYVisible,
    } = createDimensions(selection);

    expect(w).toBe(width);
    expect(h).toBe(height);
    expect(svg.getAttribute("width")).toBe(String(width));
    expect(svg.getAttribute("height")).toBe(String(height));
    expect(bScreenXVisible.toArr()).toEqual([0, width]);
    expect(bScreenYVisible.toArr()).toEqual([height, 0]);
  });
});

describe("createScales", () => {
  const bX = new AR1Basis(0, 100);
  const bY = new AR1Basis(100, 0);

  it("omits ySf when dual axis disabled", () => {
    const scales = createScales(bX, bY, false);
    expect(scales.ySf).toBeUndefined();
    expect(scales.x.range()).toEqual([0, 100]);
    expect(scales.yNy.range()).toEqual([100, 0]);
  });

  it("creates ySf when dual axis enabled", () => {
    const scales = createScales(bX, bY, true);
    expect(scales.ySf).toBeDefined();
    expect(scales.ySf!.range()).toEqual([100, 0]);
  });
});

describe("updateScaleX", () => {
  const makeSource = (data: Array<[number, number?]>): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: 1,
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
  const makeSource = (data: Array<[number, number?]>): IDataSource => ({
    startTime: 0,
    timeStep: 1,
    length: data.length,
    seriesCount: 1,
    getSeries: (i) => data[i][0],
  });

  it("sets domain from visible data bounds", () => {
    const cd = new ChartData(makeSource([[10], [20], [40]]));
    const y = scaleLinear().range([100, 0]);
    const vt = {
      onReferenceViewWindowResize: vi.fn(),
    } as unknown as ViewportTransform;
    updateScaleY(new AR1Basis(0, 2), cd.treeNy, vt, y, cd);
    expect(y.domain()).toEqual([10, 40]);
  });
});

describe("initPaths", () => {
  it("creates single series elements", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const selection = select(svg) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >;
    const { path, viewNy, viewSf } = initPaths(selection, false);
    expect(path.nodes()).toHaveLength(1);
    expect(viewNy.tagName).toBe("g");
    expect(viewSf).toBeUndefined();
    expect(svg.querySelectorAll("g.view")).toHaveLength(1);
    expect(svg.querySelectorAll("path")).toHaveLength(1);
  });

  it("creates dual series elements", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const selection = select(svg) as unknown as Selection<
      SVGSVGElement,
      unknown,
      HTMLElement,
      unknown
    >;
    const { path, viewNy, viewSf } = initPaths(selection, true);
    expect(path.nodes()).toHaveLength(2);
    expect(viewNy.tagName).toBe("g");
    expect(viewSf!.tagName).toBe("g");
    expect(svg.querySelectorAll("g.view")).toHaveLength(2);
    expect(svg.querySelectorAll("path")).toHaveLength(2);
  });
});
