import { csv } from "d3-fetch";

/**
 * Parsed benchmark dataset with parallel arrays for dates and two series.
 */
export interface BenchmarkDataset {
  dates: Date[];
  ny: number[];
  sf: number[];
}

/** Parse a temperature string like "46;51;56" – returns the first value. */
function parseTemp(value: string | undefined): number {
  if (!value || value.trim() === "") return NaN;
  const parts = value.split(";");
  return parseFloat(parts[0] ?? "");
}

/**
 * Load ny-vs-sf.csv from the demos folder and return the raw ~1071-row dataset.
 */
export async function loadCsvData(): Promise<BenchmarkDataset> {
  const rows = (await csv("../../demos/ny-vs-sf.csv")) as {
    Date: string;
    NY: string;
    SF: string;
  }[];

  const dates: Date[] = [];
  const ny: number[] = [];
  const sf: number[] = [];

  for (const row of rows) {
    dates.push(new Date(row.Date));
    ny.push(parseTemp(row.NY));
    sf.push(parseTemp(row.SF));
  }

  return { dates, ny, sf };
}

/**
 * Scale a dataset to `targetSize` rows by tiling the source values and
 * generating evenly-spaced timestamps starting from the first source date.
 */
export function scaleDataset(
  source: BenchmarkDataset,
  targetSize: number,
): BenchmarkDataset {
  const dates: Date[] = [];
  const ny: number[] = [];
  const sf: number[] = [];
  const timeStep = 86400000; // 1 day in ms
  const startTime = source.dates[0]?.getTime() ?? Date.now();
  const srcLen = source.dates.length;

  for (let i = 0; i < targetSize; i++) {
    dates.push(new Date(startTime + i * timeStep));
    ny.push(source.ny[i % srcLen]!);
    sf.push(source.sf[i % srcLen]!);
  }

  return { dates, ny, sf };
}

/** Predefined dataset sizes used in the benchmark suite. */
//export const DATA_SIZES = [10_000, 100_000, 1_000_000] as const;
export const DATA_SIZES = [100, 1_000, 10_000] as const;
