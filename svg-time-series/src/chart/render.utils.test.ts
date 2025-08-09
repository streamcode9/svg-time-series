/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { select, Selection } from "d3-selection";
import { scaleLinear, scaleTime } from "d3-scale";
import { AR1Basis, DirectProductBasis } from "../math/affine.ts";
import { ChartData, IDataSource } from "./data.ts";
import type { ViewportTransform } from "../ViewportTransform.ts";
import { vi } from "vitest";
import {
  createDimensions,
  createScales,
  updateScaleX,
  initPaths,
} from "./render/utils.ts";

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
});

describe("createScales", () => {
  const bX = new AR1Basis(0, 100);
  const bY = new AR1Basis(100, 0);
  const b = DirectProductBasis.fromProjections(bX, bY);

  it("creates single y scale when count is 1", () => {
    const scales = createScales(b, 1);
    expect(scales.y).toHaveLength(1);
    expect(scales.x.range()).toEqual([0, 100]);
    expect(scales.y[0].range()).toEqual([100, 0]);
  });

  it("creates multiple y scales when count > 1", () => {
    const scales = createScales(b, 2);
    expect(scales.y).toHaveLength(2);
    expect(scales.y[1].range()).toEqual([100, 0]);
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
    const vt = {
      onReferenceViewWindowResize: vi.fn(),
    } as unknown as ViewportTransform;
    const dp = cd.updateScaleY(new AR1Basis(0, 2), cd.treeAxis0);
    vt.onReferenceViewWindowResize(dp);
    y.domain(dp.y().toArr());
    expect(y.domain()).toEqual([10, 40]);
    expect(vt.onReferenceViewWindowResize).toHaveBeenCalledWith(dp);
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
    const { path, nodes } = initPaths(selection, 1);
    expect(path.nodes()).toHaveLength(1);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].tagName).toBe("g");
    expect(nodes[1]).toBeUndefined();
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
    const { path, nodes } = initPaths(selection, 2);
    expect(path.nodes()).toHaveLength(2);
    expect(nodes).toHaveLength(2);
    expect(nodes[0].tagName).toBe("g");
    expect(nodes[1].tagName).toBe("g");
    expect(svg.querySelectorAll("g.view")).toHaveLength(2);
    expect(svg.querySelectorAll("path")).toHaveLength(2);
  });
});
