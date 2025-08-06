import { ViewportTransform } from "./ViewportTransform.ts";
import { updateNode } from "./viewZoomTransform.ts";

export function applyViewportTransform(
  node: SVGGraphicsElement,
  transform: ViewportTransform,
): void {
  updateNode(node, transform.matrix);
}
