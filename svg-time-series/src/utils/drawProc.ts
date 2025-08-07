import { timeout as runTimeout } from "d3-timer";

export function drawProc<F extends (...args: unknown[]) => void>(
  f: F,
): (...args: Parameters<F>) => void {
  let requested = false;
  let latestParams: Parameters<F>;

  return (...params: Parameters<F>) => {
    latestParams = params;
    if (!requested) {
      requested = true;
      runTimeout(() => {
        requested = false;
        f(...latestParams);
      });
    }
  };
}
