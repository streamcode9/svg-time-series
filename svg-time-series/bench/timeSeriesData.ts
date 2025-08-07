export const sizes = [100, 1_000, 10_000];

function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generate(length: number, seed: number): [number, number][] {
  const rand = mulberry32(seed);
  const phase1 = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;
  const freq1 = rand() * 0.02 + 0.005;
  const freq2 = rand() * 0.05 + 0.01;
  const amp1 = rand() * 10 + 5;
  const amp2 = rand() * 5 + 2;
  return Array.from({ length }, (_, i) => [
    i,
    Math.sin(i * freq1 + phase1) * amp1 + Math.sin(i * freq2 + phase2) * amp2,
  ]);
}

export const datasets = sizes.map((size, idx) => generate(size, idx + 1));
