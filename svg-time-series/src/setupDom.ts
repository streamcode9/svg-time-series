interface DOMGlobals {
  DOMMatrix?: typeof globalThis.DOMMatrix;
  DOMPoint?: typeof globalThis.DOMPoint;
  window?: unknown;
}

async function polyfillDom(): Promise<void> {
  const globalObj = globalThis as DOMGlobals;
  if (
    typeof globalObj.DOMMatrix === "undefined" ||
    typeof globalObj.DOMPoint === "undefined"
  ) {
    (globalObj as { window?: unknown }).window ??= globalObj;
    await import("geometry-polyfill");
  }
  if (typeof SVGSVGElement !== "undefined") {
    const proto = SVGSVGElement.prototype as unknown as {
      createSVGMatrix?: () => DOMMatrix;
    };
    proto.createSVGMatrix ??= () => new DOMMatrix();
  }
}

export { polyfillDom };
