import { f, svg } from "../common.ts";

function createTranslate(x: number, y: number) {
  const translateTransform = svg.createSVGTransform();
  translateTransform.setTranslate(x, y);
  return translateTransform;
}

function createScale(x: number, y: number) {
  const scaleTransform = svg.createSVGTransform();
  scaleTransform.setScale(x, y);
  return scaleTransform;
}

function animate(id: string, yOffset: number) {
  const delta = 0;
  const scale = 0.2;

  type PathCmd = { type: string; values: number[] };
  const path = document.getElementById(id)! as SVGPathElement & {
    setPathData: (d: PathCmd[]) => void;
  };
  const pathData = [
    { type: "M", values: [0, 100] },
    ...Array.from({ length: 5000 }, (_, x) => ({
      type: "L",
      values: [x, f(x)],
    })),
  ];
  path.setPathData(pathData);

  const transformations = path.transform.baseVal;
  transformations.appendItem(createTranslate(-delta, yOffset));
  transformations.appendItem(createScale(scale, 100));
}

const start = Date.now();
function render() {
  Array.from({ length: 9 }, (_, i) => animate(`g${i}`, 50 + i * 50));
  window.requestAnimationFrame(() => {
    console.log(Date.now() - start);
  });
}
window.requestAnimationFrame(render);
