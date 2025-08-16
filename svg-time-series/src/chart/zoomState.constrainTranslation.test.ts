/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { zoomIdentity } from "d3-zoom";
import { constrainTranslation } from "./zoomState.ts";

describe("constrainTranslation", () => {
  it("clamps translation to bounds", () => {
    const current = zoomIdentity.translate(-120, -80).scale(2);
    const constrained = constrainTranslation(current, 50, 50);
    expect(constrained).toMatchObject({ x: -50, y: -50, k: 2 });
  });

  it("returns original transform when no adjustment needed", () => {
    const current = zoomIdentity;
    const constrained = constrainTranslation(current, 100, 100);
    expect(constrained).toBe(current);
  });
});
