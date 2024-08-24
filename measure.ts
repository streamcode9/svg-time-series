import { interval, timer, timeout } from "d3-timer";

export function measure(sec: number, drawFPS: (fps: string) => void): void {
  let ctr = 0;

  timer(() => ctr++);

  interval(() => {
    drawFPS((ctr / sec).toPrecision(3));
    ctr = 0;
  }, 1000 * sec);
}

export function measureOnce(sec: number, drawFPS: (fps: string) => void): void {
  let ctr = 0;

  timer(() => ctr++);

  timeout(() => {
    drawFPS((ctr / sec).toPrecision(3));
    ctr = 0;
  }, 1000 * sec);
}
