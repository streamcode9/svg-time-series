import * as common from "../common.ts";

function createTranslate(x: number, y: number) {
  const translateTransform = common.svg.createSVGTransform();
  translateTransform.setTranslate(x, y);
  return translateTransform;
}

function createScale(x: number, y: number) {
  const scaleTransform = common.svg.createSVGTransform();
  scaleTransform.setScale(x, y);
  return scaleTransform;
}

function animate(id: string, yOffset: number) {
  const delta = 0;
  const scale = 0.2;

  const path: any = document.getElementById(id);
  const pathData = [{ type: "M", values: [0, 100] }];
  for (let x = 0; x < 5000; x++) {
    pathData.push({ type: "L", values: [x, common.f(x)] });
  }
  path.setPathData(pathData);

  const transformations = path.transform.baseVal;
  transformations.appendItem(createTranslate(-delta, yOffset));
  transformations.appendItem(createScale(scale, 100));

  common.run(100, delta, scale, (delt, scal) => {
    transformations.replaceItem(createTranslate(-delta, yOffset), 0);
    transformations.replaceItem(createScale(scal, 100), 1);
  });
}

for (let i = 0; i < 9; i++) {
  animate("g" + i, 50 + i * 50);
}
