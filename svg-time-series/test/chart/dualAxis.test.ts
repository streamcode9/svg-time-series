/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { zoomIdentity } from "d3-zoom";
import { polyfillDom } from "../../src/setupDom.ts";

await polyfillDom();

import { ChartData } from "../../src/chart/data.ts";
import type { IDataSource } from "../../src/chart/data.ts";
import { setupRender } from "../../src/chart/render.ts";

function createDualAxisSource(): IDataSource {
  // Series 0 (NY-like): values 25-85
  // Series 1 (SF-like): values 45-75
  const data: [number, number][] = [];
  for (let i = 0; i < 365; i++) {
    data.push([25 + 60 * Math.sin(i / 30), 45 + 30 * Math.sin(i / 25)]);
  }
  return {
    startTime: Date.now(),
    timeStep: 86400000,
    length: data.length,
    seriesAxes: [0, 1],
    getSeries: (i, seriesIdx) => data[i]![seriesIdx]!,
  };
}

function createSvg(): Selection<SVGSVGElement, unknown, HTMLElement, unknown> {
  const div = document.createElement("div");
  Object.defineProperty(div, "clientWidth", { value: 600 });
  Object.defineProperty(div, "clientHeight", { value: 300 });
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  div.appendChild(svgEl);
  document.body.appendChild(div);
  return select(svgEl) as unknown as Selection<
    SVGSVGElement,
    unknown,
    HTMLElement,
    unknown
  >;
}

describe("dual-axis transform consistency", () => {
  it("ViewportTransform scaleY matches model.scale for both axes", () => {
    const source = createDualAxisSource();
    const data = new ChartData(source);
    const svg = createSvg();
    const state = setupRender(svg, data);
    state.refresh(data, zoomIdentity);

    const testValues = [40, 50, 60, 70];

    for (let axisIdx = 0; axisIdx < 2; axisIdx++) {
      const model = state.axisManager.axes[axisIdx]!;
      const vtScaleY = model.transform.scaleY;
      const axisScale = model.scale;

      for (const value of testValues) {
        expect(vtScaleY(value)).toBeCloseTo(axisScale(value), 6);
      }
    }
  });

  it("g.view transform matrix maps model Y to same screen Y as scaleY", () => {
    const source = createDualAxisSource();
    const data = new ChartData(source);
    const svg = createSvg();
    const state = setupRender(svg, data);
    state.refresh(data, zoomIdentity);

    const testValues = [40, 50, 60, 70];

    for (const s of state.series) {
      const model = state.axisManager.axes[s.axisIdx]!;
      const matrix = model.transform.matrix;

      for (const value of testValues) {
        const matrixY = matrix.d * value + matrix.f;
        expect(matrixY).toBeCloseTo(model.transform.scaleY(value), 6);
      }
    }
  });

  it("two axes have different domains but same range", () => {
    const source = createDualAxisSource();
    const data = new ChartData(source);
    const svg = createSvg();
    const state = setupRender(svg, data);
    state.refresh(data, zoomIdentity);

    const axis0 = state.axisManager.axes[0]!;
    const axis1 = state.axisManager.axes[1]!;
    const domain0 = axis0.scale.domain() as [number, number];
    const domain1 = axis1.scale.domain() as [number, number];

    expect(domain0[0]).not.toBeCloseTo(domain1[0], 1);
    expect(axis0.scale.range()).toEqual(axis1.scale.range());
  });

  it("same model value maps to different screen Y for each axis", () => {
    const source = createDualAxisSource();
    const data = new ChartData(source);
    const svg = createSvg();
    const state = setupRender(svg, data);
    state.refresh(data, zoomIdentity);

    const y0 = state.axisManager.axes[0]!.scale(40);
    const y1 = state.axisManager.axes[1]!.scale(40);

    expect(y0).not.toBeCloseTo(y1, 1);
  });

  it("left Y-axis grid lines extend into the visible chart area", () => {
    const source = createDualAxisSource();
    const data = new ChartData(source);
    const svg = createSvg();
    const state = setupRender(svg, data);
    state.refresh(data, zoomIdentity);

    // axis 1 (Left) render group
    const leftAxisG = state.axisRenders[1]!.g;
    const line = leftAxisG.select<SVGLineElement>(".tick line");
    const x2 = parseFloat(line.attr("x2"));

    // Grid lines should extend into positive x (visible chart area)
    expect(x2).toBeGreaterThan(0);
  });
});
