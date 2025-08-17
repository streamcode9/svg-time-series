import { JSDOM } from "jsdom";

const NS = "http://www.w3.org/2000/svg";

export function createDiv(innerHTML = "") {
  const dom = new JSDOM(`<div>${innerHTML}</div>`, {
    pretendToBeVisual: true,
    contentType: "text/html",
  });
  (
    globalThis as unknown as { HTMLElement: typeof dom.window.HTMLElement }
  ).HTMLElement = dom.window.HTMLElement;
  const div = dom.window.document.querySelector<HTMLDivElement>("div")!;
  return { dom, div };
}

export function createSvg() {
  const dom = new JSDOM(`<svg xmlns="${NS}"></svg>`, {
    contentType: "image/svg+xml",
  });
  const svg = dom.window.document.querySelector<SVGSVGElement>("svg")!;
  return { dom, svg };
}
