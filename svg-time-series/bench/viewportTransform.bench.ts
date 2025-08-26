import { bench, describe } from "vitest";
import { zoomIdentity } from "d3-zoom";
import { ViewportTransform } from "../src/ViewportTransform.ts";
import { polyfillDom } from "../src/setupDom.ts";

await polyfillDom();

describe("ViewportTransform performance", () => {
  const vt = new ViewportTransform();
  vt.onViewPortResize([0, 100], [0, 100]);
  vt.onReferenceViewWindowResize([0, 10], [0, 10]);

  const t = zoomIdentity.translate(10, 0).scale(2);

  bench("onZoomPan", () => {
    vt.onZoomPan(t);
  });

  bench("scaleX.invert", () => {
    vt.scaleX.invert(50);
  });

  bench("scaleX.invert basis", () => {
    vt.scaleX.invert(20);
    vt.scaleX.invert(40);
  });
});
