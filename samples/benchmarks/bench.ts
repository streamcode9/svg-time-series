import { csv } from "d3-fetch";
import { timer as runTimer } from "d3-timer";

export { measure, measureOnce } from "../measure.ts";

export function onCsv(f: (csv: number[][]) => void): void {
  csv("../../demos/ny-vs-sf.csv", (d: { NY: string; SF: string }) => [
    parseFloat(d.NY.split(";")[0]),
    parseFloat(d.SF.split(";")[0]),
  ])
    .then((data: number[][]) => {
      f(data);
    })
    .catch(() => {
      console.error("Data can't be downloaded or parsed");
    });
}

export function animateBench(f: (elapsed: number) => void): void {
  const timer = runTimer((elapsed: number) => {
    f(elapsed);
    if (elapsed > 60 * 1000) {
      timer.stop();
    }
  });
}

function raisedCos(elapsed: number) {
  return -(Math.cos(elapsed / 6500) - 1) / 2;
}

export function animateCosDown(maxX: number, minX: number, elapsed: number) {
  return maxX - (maxX - minX) * raisedCos(elapsed);
}
