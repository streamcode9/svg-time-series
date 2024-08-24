import { csv } from "d3-request";
import { timer as runTimer } from "d3-timer";

import { measure, measureOnce } from "../measure";

export function measureAll(): void {
  measure(3, (fps) => {
    document.getElementById("fps").textContent = fps;
  });

  measureOnce(60, (fps) => {
    alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`);
  });
}

export function onCsv(f: (csv: number[][]) => void): void {
  csv("ny-vs-sf.csv")
    .row((d: { NY: string; SF: string }) => [
      parseFloat(d.NY.split(";")[0]),
      parseFloat(d.SF.split(";")[0]),
    ])
    .get((error: null, data: number[][]) => {
      if (error != null) {
        alert("Data can't be downloaded or parsed");
        return;
      }
      f(data);
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
