export interface FrameCounter {
  read(): number;
  reset(): void;
  stop(): void;
}

export function startFrameCounter(): FrameCounter {
  let count = 0;
  let handle = 0;

  const tick = () => {
    count++;
    handle = requestAnimationFrame(tick);
  };

  handle = requestAnimationFrame(tick);

  return {
    read: () => count,
    reset: () => {
      count = 0;
    },
    stop: () => {
      if (handle) {
        cancelAnimationFrame(handle);
        handle = 0;
      }
    },
  };
}

export function measure(sec: number, drawFPS: (fps: string) => void): void {
  const counter = startFrameCounter();
  setInterval(() => {
    drawFPS((counter.read() / sec).toPrecision(3));
    counter.reset();
  }, 1000 * sec);
}

export function measureOnce(sec: number, drawFPS: (fps: string) => void): void {
  const counter = startFrameCounter();
  setTimeout(() => {
    drawFPS((counter.read() / sec).toPrecision(3));
    counter.stop();
  }, 1000 * sec);
}
