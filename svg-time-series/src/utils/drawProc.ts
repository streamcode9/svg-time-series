export function drawProc<F extends (...args: unknown[]) => void>(
  f: F,
): {
  wrapped: (...args: Parameters<F>) => void;
  cancel: () => void;
} {
  let rafId: number | null = null;
  let latestParams: Parameters<F> | null = null;

  const wrapped = (...params: Parameters<F>) => {
    latestParams = params;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (latestParams) {
          f(...latestParams);
        }
      });
    }
  };

  const cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    latestParams = null;
  };

  return { wrapped, cancel };
}
