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
  const read = () => ({
    frames: durations.length,
    total: durations.reduce((a, b) => a + b, 0),
  });
  const reset = () => {
    durations.length = 0;
  };

  if (
    typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes?.includes("frame")
  ) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        durations.push(entry.duration);
      }
    });
    observer.observe({ type: "frame", buffered: true });
    return {
      read,
      reset,
      stop: () => {
        observer.disconnect();
      },
    };
  }

  let rafId = 0;
  let prev: number | undefined;
  const loop = (time: number) => {
    if (prev !== undefined) {
      durations.push(time - prev);
    }
    prev = time;
    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);
  return {
    read,
    reset,
    stop: () => {
      cancelAnimationFrame(rafId);
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
