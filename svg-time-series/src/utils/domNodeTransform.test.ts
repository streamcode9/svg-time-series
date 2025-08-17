import { describe, it, expect } from "vitest";
import { polyfillDom } from "../setupDom.ts";
import { updateNode } from "./domNodeTransform.ts";

await polyfillDom();

class FakeNode {
  attributes: Record<string, string> = {};
  ownerSVGElement = new (globalThis.SVGSVGElement as unknown as {
    new (): SVGSVGElement;
  })();

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
}

describe("updateNode", () => {
  it("applies matrix transform as attribute string", () => {
    const node = new FakeNode();
    const matrix = new DOMMatrix().translate(5, 6);
    updateNode(node as unknown as SVGGraphicsElement, matrix);
    expect(node.attributes["transform"]).toBe("matrix(1,0,0,1,5,6)");
  });
});
