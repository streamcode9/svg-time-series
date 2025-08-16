import { SegmentTree } from "segment-tree-rmq";

import { scaleLinear, type ScaleLinear } from "d3-scale";
import { extent } from "d3-array";
import type { ZoomTransform } from "d3-zoom";
import type { Basis } from "../basis.ts";
import { SlidingWindow } from "./slidingWindow.ts";
import { assertFiniteNumber, assertPositiveInteger } from "./validation.ts";
import { buildMinMax, minMaxIdentity } from "./minMax.ts";
import type { LegendPoint } from "./legend.ts";

export interface IMinMax {
  readonly min: number;
  readonly max: number;
}

export interface IDataSource {
  readonly startTime: number;
  readonly timeStep: number;
  readonly length: number;
  /**
   * Mapping from series index to Y-axis index. Each entry must be either 0 or 1.
   */
  readonly seriesAxes: number[];
  getSeries(index: number, seriesIdx: number): number;
}

function validateSource(source: IDataSource): void {
  assertPositiveInteger(source.length, "ChartData length");
  assertFiniteNumber(source.startTime, "ChartData startTime");
  assertFiniteNumber(source.timeStep, "ChartData timeStep");
  if (source.timeStep <= 0) {
    throw new Error("ChartData requires timeStep to be greater than 0");
  }
  assertPositiveInteger(
    source.seriesAxes.length,
    "ChartData requires at least one series",
  );
  source.seriesAxes.forEach((axis, axisIdx) => {
    if (axis !== 0 && axis !== 1) {
      throw new Error(
        `ChartData seriesAxes[${String(axisIdx)}] must be 0 or 1; received ${String(
          axis,
        )}`,
      );
    }
  });
}

export class ChartData {
  private readonly window: SlidingWindow;
  public readonly seriesByAxis: [number[], number[]] = [[], []];
  public bIndexFull: Basis;
  public readonly startTime: number;
  public readonly timeStep: number;
  public readonly seriesCount: number;
  public readonly seriesAxes: number[];
  /**
   * Persistent mapping from window-relative index to timestamp.
   * Domain remains [0, 1] and the range shifts forward with the
   * sliding window to avoid recreating the scale on every query.
   */
  public readonly indexToTime: ScaleLinear<number, number>;
  /**
   * Persistent mapping from data index to screen range. The domain never
   * changes, and the range is updated on demand in `bIndexFromTransform` to
   * avoid reconstructing the scale for every call.
   */
  private readonly indexScale: ScaleLinear<number, number>;

  /**
   * Creates a new ChartData instance.
   * @param source Data source; must contain at least one point.
   * @throws if the source has length 0.
   */
  constructor(source: IDataSource) {
    validateSource(source);
    this.seriesAxes = source.seriesAxes;
    this.seriesCount = this.seriesAxes.length;
    this.seriesAxes.forEach((axis, axisIdx) =>
      this.seriesByAxis[axis as 0 | 1].push(axisIdx),
    );
    const initialData = Array.from({ length: source.length }).map((_, i) =>
      Array.from({ length: this.seriesCount }).map((_, j) =>
        source.getSeries(i, j),
      ),
    );
    this.window = new SlidingWindow(initialData);
    this.startTime = source.startTime;
    this.timeStep = source.timeStep;
    // bIndexFull represents the full range of data indices and remains constant
    // since append() maintains a sliding window of fixed length
    this.bIndexFull = [0, this.window.length - 1];
    this.indexToTime = scaleLinear<number, number>()
      .domain([0, 1])
      .range([this.startTime, this.startTime + this.timeStep]);
    this.indexScale = scaleLinear<number, number>()
      .domain(this.bIndexFull)
      .range([0, 1]);
  }

  append(...values: number[]): void {
    this.window.append(...values);
    const [r0, r1] = this.indexToTime.range() as [number, number];
    this.indexToTime.range([r0 + this.timeStep, r1 + this.timeStep]);
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
    assertFiniteNumber(idx, "ChartData.getPoint idx");
    const clamped = this.clampIndex(Math.round(idx));
    return {
      values: this.window.data[clamped]!,
      timestamp:
        this.startTime + (this.window.startIndex + clamped) * this.timeStep,
    };
  }

  timeToIndex(time: number): number {
    assertFiniteNumber(time, "ChartData.timeToIndex time");
    const idx = this.indexToTime.invert(time);
    return this.clampIndex(idx);
  }

  timeDomainFull(): [Date, Date] {
    const toTime = this.indexToTime;
    return this.bIndexFull.map((i) => new Date(toTime(i))) as [Date, Date];
  }

  bIndexFromTransform(
    transform: ZoomTransform,
    range: [number, number],
  ): ScaleLinear<number, number> {
    this.indexScale.range(range);
    return transform.rescaleX(this.indexScale);
  }

  /**
   * Clamp a raw index to the valid data range.
   * Exposed for shared bounds checking across components.
   */
  public clampIndex(idx: number): number {
    return Math.min(Math.max(idx, 0), this.window.length - 1);
  }

  public assertAxisBounds(axisCount: number): void {
    this.seriesByAxis.forEach((series, i) => {
      if (i >= axisCount && series.length > 0) {
        throw new Error(
          `Series axis index ${String(i)} out of bounds (max ${String(axisCount - 1)})`,
        );
      }
    });
  }

  buildAxisTree(axis: number): SegmentTree<IMinMax> {
    if (axis !== 0 && axis !== 1) {
      throw new Error(
        `ChartData.buildAxisTree axis must be 0 or 1; received ${String(axis)}`,
      );
    }
    const idxs = this.seriesByAxis[axis];
    const arr = this.data.map((row) =>
      idxs
        .map((j) => {
          const v = row[j]!;
          return Number.isFinite(v) ? { min: v, max: v } : minMaxIdentity;
        })
        .reduce(buildMinMax, minMaxIdentity),
    );
    return new SegmentTree(arr, buildMinMax, minMaxIdentity);
  }
  bAxisVisible(bIndexVisible: Basis, tree: SegmentTree<IMinMax>): Basis {
    const [minIdxX, maxIdxX] = bIndexVisible;
    let startIdx = Math.floor(minIdxX);
    let endIdx = Math.ceil(maxIdxX);
    startIdx = this.clampIndex(startIdx);
    endIdx = this.clampIndex(endIdx);
    if (startIdx > endIdx) {
      [startIdx, endIdx] = [endIdx, startIdx];
    }
    const { min, max } = tree.query(startIdx, endIdx);
    const [y0, y1] = extent([min, max]) as [
      number | undefined,
      number | undefined,
    ];
    return [y0 ?? NaN, y1 ?? NaN];
  }

  updateScaleY(
    bIndexVisible: Basis,
    tree: SegmentTree<IMinMax>,
  ): ScaleLinear<number, number> {
    const [min, max] = this.bAxisVisible(bIndexVisible, tree);
    return scaleLinear<number, number>().domain([min, max]);
  }

  axisTransform(
    axisIdx: number,
    dIndexVisible: [number, number],
  ): {
    tree: SegmentTree<IMinMax>;
    scale: ScaleLinear<number, number>;
  } {
    const tree = this.buildAxisTree(axisIdx);
    const scale = this.updateScaleY([dIndexVisible[0], dIndexVisible[1]], tree);
    let [min, max] = scale.domain() as [number, number];
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      min = 0;
      max = 1;
    }
    scale.domain([min, max]);
    return { tree, scale };
  }

  combinedAxisDp(
    bIndexVisible: Basis,
    tree0: SegmentTree<IMinMax>,
    tree1: SegmentTree<IMinMax>,
    scale: ScaleLinear<number, number>,
  ): ScaleLinear<number, number> {
    const b0 = this.bAxisVisible(bIndexVisible, tree0);
    const b1 = this.bAxisVisible(bIndexVisible, tree1);
    const [min, max] = extent([...b0, ...b1]) as [
      number | undefined,
      number | undefined,
    ];
    return scale.domain([min ?? NaN, max ?? NaN]);
  }
}
