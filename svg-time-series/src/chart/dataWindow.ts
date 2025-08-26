import { scaleUtc } from "d3-scale";
import type { ScaleTime } from "d3-scale";
import type { ZoomTransform } from "d3-zoom";

import { SlidingWindow } from "./slidingWindow.ts";
import type { LegendPoint } from "./legend.ts";

export class DataWindow {
  private readonly window: SlidingWindow;
  public readonly startTime: number;
  public readonly timeStep: number;
  /**
   * Persistent mapping between timestamps and indices.
   * Domain represents the time range and shifts forward with the
   * sliding window to avoid recreating the scale on every query.
   */
  private readonly timeScale: ScaleTime<number, number>;
  private timeRange: [number, number];
  public readonly bIndexFull: readonly [number, number];

  constructor(initialData: number[][], startTime: number, timeStep: number) {
    this.window = new SlidingWindow(initialData);
    this.startTime = startTime;
    this.timeStep = timeStep;
    this.bIndexFull = [0, this.window.length - 1];
    this.timeScale = scaleUtc<number, number>()
      .clamp(true)
      .domain([
        new Date(this.startTime),
        new Date(this.startTime + (this.window.length - 1) * this.timeStep),
      ])
      .range(this.bIndexFull);
    this.timeRange = [0, 1];
  }

  append(...values: number[]): void {
    this.window.append(...values);
    const [d0, d1] = this.timeScale.domain() as [Date, Date];
    this.timeScale.domain([
      new Date(+d0 + this.timeStep),
      new Date(+d1 + this.timeStep),
    ]);
  }

  get length(): number {
    return this.window.length;
  }

  get data(): number[][] {
    return this.window.data;
  }

  get startIndex(): number {
    return this.window.startIndex;
  }

  getPoint(idx: number): LegendPoint {
    const clamped = Math.round(this.clampIndex(idx));
    return {
      values: this.window.data[clamped]!,
      timestamp:
        this.startTime + (this.window.startIndex + clamped) * this.timeStep,
    };
  }

  indexToTime(idx: number): Date {
    return new Date(this.timeScale.invert(idx));
  }

  timeToIndex(time: Date): number {
    return this.timeScale(time);
  }

  timeDomainFull(): [Date, Date] {
    return this.timeScale.domain().map((d) => new Date(d)) as [Date, Date];
  }

  onViewPortResize(range: [number, number]): void {
    this.timeRange = range;
  }

  dIndexFromTransform(transform: ZoomTransform): [number, number] {
    const [t0, t1] = transform
      .rescaleX(this.timeScale.copy().range(this.timeRange))
      .domain() as [Date, Date];
    return [this.timeScale(t0), this.timeScale(t1)];
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    const max = this.window.length - 1;
    return Math.max(0, Math.min(idx, max));
  }
}
