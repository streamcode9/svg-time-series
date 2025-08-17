import { describe, it, expect } from "vitest";
import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { scaleLinear } from "d3-scale";
import { createSvg } from "../../test/domUtils.ts";
import { MyAxis, Orientation } from "./axis.ts";

const NS = "http://www.w3.org/2000/svg";

function createGroup() {
  const { svg } = createSvg();
  const g = svg.ownerDocument.createElementNS(NS, "g");
  svg.appendChild(g);
  return { g };
}

describe("MyAxis tick creation", () => {
  it("creates ticks for a single scale", () => {
    const { g } = createGroup();
    const scale = scaleLinear().domain([0, 100]).range([0, 100]);
    const axis = new MyAxis(Orientation.Bottom, scale).setTickValues([
      0, 50, 100,
    ]);
    axis.axis(
      select(g) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
    );

    const ticks = Array.from(g.querySelectorAll(".tick"));
    expect(ticks.map((t) => t.getAttribute("transform"))).toEqual([
      "translate(0,0)",
      "translate(50,0)",
      "translate(100,0)",
    ]);
    const labels = ticks.map((t) => t.querySelector("text")!.textContent);
    expect(labels).toEqual(["0", "50", "100"]);
  });

  it("creates ticks for dual scales (regression)", () => {
    const { g } = createGroup();
    const scale1 = scaleLinear().domain([0, 100]).range([0, 100]);
    const scale2 = scaleLinear().domain([0, 1]).range([0, 200]);
    const axis = new MyAxis(Orientation.Bottom, scale1, scale2).ticks(3);
    axis.axis(
      select(g) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
    );

    const ticks = Array.from(g.querySelectorAll(".tick"));
    expect(ticks.length).toBe(6);
    expect(ticks.map((t) => t.getAttribute("transform"))).toEqual([
      "translate(0,0)",
      "translate(50,0)",
      "translate(100,0)",
      "translate(0,0)",
      "translate(100,0)",
      "translate(200,0)",
    ]);
    const labels = ticks.map((t) =>
      parseFloat(t.querySelector("text")!.textContent || ""),
    );
    expect(labels).toEqual([0, 50, 100, 0, 0.5, 1]);
  });

  it("updates ticks for dual scales with axisUp", () => {
    const { g } = createGroup();
    const scale1 = scaleLinear().domain([0, 100]).range([0, 100]);
    const scale2 = scaleLinear().domain([0, 1]).range([0, 200]);
    const axis = new MyAxis(Orientation.Bottom, scale1, scale2).ticks(3);
    axis.axis(
      select(g) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
    );

    scale1.range([0, 200]);
    scale2.range([0, 400]);
    axis.setScale(scale1, scale2);
    axis.axisUp(
      select(g) as unknown as Selection<
        SVGGElement,
        unknown,
        HTMLElement,
        unknown
      >,
    );

    const ticks = Array.from(g.querySelectorAll(".tick"));
    expect(ticks.map((t) => t.getAttribute("transform"))).toEqual([
      "translate(0,0)",
      "translate(100,0)",
      "translate(200,0)",
      "translate(0,0)",
      "translate(200,0)",
      "translate(400,0)",
    ]);
  });
});
