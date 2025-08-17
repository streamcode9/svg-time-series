import {
  scaleLinear,
  scaleUtc,
  type ScaleLinear,
  type ScaleTime,
} from "d3-scale";
import type { ZoomTransform } from "d3-zoom";

import { SlidingWindow } from "./slidingWindow.ts";
import type { LegendPoint } from "./legend.ts";

export class DataWindow {
  private readonly window: SlidingWindow;
  public readonly startTime: number;
  public readonly timeStep: number;
  /**
   * Persistent mapping from window-relative index to timestamp.
   * Domain remains [0, 1] and the range shifts forward with the
   * sliding window to avoid recreating the scale on every query.
   */
  public readonly indexToTime: ScaleTime<Date, Date>;
  /**
   * Persistent mapping from data index to screen range. The domain never
   * changes, and the range is updated on demand in `dIndexFromTransform` to
   * avoid reconstructing the scale for every call.
   */
  private readonly indexScale: ScaleLinear<number, number>;
  public readonly bIndexFull: readonly [number, number];

  constructor(initialData: number[][], startTime: number, timeStep: number) {
    this.window = new SlidingWindow(initialData);
    this.startTime = startTime;
    this.timeStep = timeStep;
    this.bIndexFull = [0, this.window.length - 1];
    this.indexToTime = scaleUtc<Date, Date>()
      .clamp(true)
      .domain(this.bIndexFull)
      .range([
        new Date(this.startTime),
        new Date(this.startTime + (this.window.length - 1) * this.timeStep),
      ]);
    this.indexScale = scaleLinear<number, number>()
      .clamp(true)
      .domain(this.bIndexFull)
      .range([0, 1]);
  }

  append(...values: number[]): void {
    this.window.append(...values);
    const [r0, r1] = this.indexToTime.range() as [Date, Date];
    this.indexToTime.range([
      new Date(+r0 + this.timeStep),
      new Date(+r1 + this.timeStep),
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

  timeToIndex(time: Date): number {
    return +this.indexToTime.invert(time);
  }

  timeDomainFull(): [Date, Date] {
    const toTime = this.indexToTime.copy().clamp(false);
    return this.bIndexFull.map((i) => toTime(i)) as [Date, Date];
  }

  dIndexFromTransform(
    transform: ZoomTransform,
    range: [number, number],
  ): [number, number] {
    this.indexScale.range(range);
    return transform.rescaleX(this.indexScale).domain() as [number, number];
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
