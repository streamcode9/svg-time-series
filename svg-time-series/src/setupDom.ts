interface DOMGlobals {
  DOMMatrix?: typeof globalThis.DOMMatrix;
  DOMPoint?: typeof globalThis.DOMPoint;
  window?: unknown;
  SVGSVGElement?: typeof globalThis.SVGSVGElement;
}

async function polyfillDom(): Promise<void> {
  const globalObj = globalThis as DOMGlobals;
  if (
    typeof globalObj.DOMMatrix === "undefined" ||
    typeof globalObj.DOMPoint === "undefined"
  ) {
    (globalObj as { window?: unknown }).window ??= globalObj;
    await import("geometry-polyfill");
    (globalObj as { SVGMatrix?: typeof globalThis.DOMMatrix }).SVGMatrix ??=
      globalObj.DOMMatrix!;
  }
  if (typeof globalObj.SVGSVGElement === "undefined") {
    class SVGSVGElementPolyfill {
      createSVGMatrix() {
        return new DOMMatrix();
      }
    }
    (
      globalObj as {
        SVGSVGElement: typeof globalThis.SVGSVGElement;
      }
    ).SVGSVGElement =
      SVGSVGElementPolyfill as unknown as typeof globalThis.SVGSVGElement;
  } else {
    const proto = globalObj.SVGSVGElement.prototype as unknown as {
      createSVGMatrix?: () => DOMMatrix;
    };
    proto.createSVGMatrix ??= () => new DOMMatrix();
  }
}

export { polyfillDom };
