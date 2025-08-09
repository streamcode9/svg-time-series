const xsvg = document.getElementById(
  "svg-container",
) as unknown as SVGSVGElement;
export const svg: SVGSVGElement = xsvg;

export function f(x: number) {
  return Math.sin(x / 100) / 4.0 + 0.5 + Math.sin(x / 10) / 15.0;
}

export function run(
  stepsCount: number = 100,
  delta: number = 0,
  scale: number = 0.2,
  fnRender: (delta: number, scale: number) => void,
) {
  let time: number | null = null;
  let start: number | null = null;
  const render = (timestamp: number) => {
    if (!start) {
      start = timestamp;
    }
    if (time) {
      console.log(timestamp - time);
    }
    time = timestamp;

    fnRender(delta, scale);

    delta = ((timestamp - start) / 20) * (2 / 5);
    scale = 1 + 0.8 * Math.sin(delta / 50);
    if (--stepsCount > 0) {
      window.requestAnimationFrame(render);
    }
  };
  window.requestAnimationFrame(render);
}
