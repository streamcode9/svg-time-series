import { timeout as runTimeout } from "d3-timer";

export function drawProc<F extends (...args: unknown[]) => void>(
  f: F,
): (...args: Parameters<F>) => void {
  let requested = false;

  return (...params: Parameters<F>) => {
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...params);
      });
    }
  };
}
