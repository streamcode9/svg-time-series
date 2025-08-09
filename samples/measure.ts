export interface FrameStats {
  fps: number;
  frameTime: number;
}

interface FrameCounter {
  read(): { frames: number; total: number };
  reset(): void;
  stop(): void;
}

function startFrameCounter(): FrameCounter {
  const durations: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      durations.push(entry.duration);
    }
  });
  // "frame" is not yet in the TypeScript lib definitions
  observer.observe({ entryTypes: ["frame"], buffered: true });

  return {
    read: () => ({
      frames: durations.length,
      total: durations.reduce((a, b) => a + b, 0),
    }),
    reset: () => {
      durations.length = 0;
    },
    stop: () => {
      observer.disconnect();
    },
  };
}

export function measure(sec: number, draw: (stats: FrameStats) => void): void {
  const counter = startFrameCounter();
  setInterval(() => {
    const { frames, total } = counter.read();
    const fps = frames === 0 ? 0 : frames / sec;
    const frameTime = frames === 0 ? 0 : total / frames;
    draw({ fps, frameTime });
    counter.reset();
  }, 1000 * sec);
}

export function measureOnce(
  sec: number,
  draw: (stats: FrameStats) => void,
): void {
  const counter = startFrameCounter();
  setTimeout(() => {
    const { frames, total } = counter.read();
    counter.stop();
    const fps = frames === 0 ? 0 : frames / sec;
    const frameTime = frames === 0 ? 0 : total / frames;
    draw({ fps, frameTime });
  }, 1000 * sec);
}
