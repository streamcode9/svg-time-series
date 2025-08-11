import { timeout as runTimeout } from "d3-timer";

export function drawProc<F extends (...args: unknown[]) => void>(
  f: F,
): {
  wrapped: (...args: Parameters<F>) => void;
  cancel: () => void;
} {
  let requested = false;
  let latestParams: Parameters<F> | null = null;
  let timer: ReturnType<typeof runTimeout> | null = null;

  const wrapped = (...params: Parameters<F>) => {
    latestParams = params;
    if (!requested) {
      requested = true;
      timer = runTimeout(() => {
        requested = false;
        timer = null;
        if (latestParams) {
          f(...latestParams);
        }
      });
    }
  };

  const cancel = () => {
    if (timer) {
      timer.stop();
      timer = null;
    }
    requested = false;
    latestParams = null;
  };

  return { wrapped, cancel };
}
