import { timeout as runTimeout } from "d3-timer";

export function drawProc<T extends unknown[]>(
  f: (...args: T) => void,
): (...args: T) => void {
  let requested = false;

  return (...params: T) => {
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...params);
      });
    }
  };
}
