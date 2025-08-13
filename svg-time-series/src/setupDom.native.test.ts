import { describe, it, expect, vi } from "vitest";

// Ensure native DOMMatrix/DOMPoint are preserved
describe("setupDom", () => {
  it("does not override existing DOMMatrix and DOMPoint", async () => {
    const globalObj = globalThis as Record<string, unknown>;
    const originalMatrix = globalObj["DOMMatrix"];
    const originalPoint = globalObj["DOMPoint"];

    class NativeMatrix {
      // dummy property to satisfy lint
      m = 0;
    }
    class NativePoint {
      p = 0;
    }
    globalObj["DOMMatrix"] = NativeMatrix;
    globalObj["DOMPoint"] = NativePoint;

    vi.resetModules();
    await import("./setupDom.ts");

    expect(globalObj["DOMMatrix"]).toBe(NativeMatrix);
    expect(globalObj["DOMPoint"]).toBe(NativePoint);

    if (originalMatrix === undefined) {
      delete globalObj["DOMMatrix"];
    } else {
      globalObj["DOMMatrix"] = originalMatrix;
    }
    if (originalPoint === undefined) {
      delete globalObj["DOMPoint"];
    } else {
      globalObj["DOMPoint"] = originalPoint;
    }
  });
});
