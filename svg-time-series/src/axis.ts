export enum Orientation {
  Top,
  Right,
  Bottom,
  Left,
}

const id = <T>(x: T) => x;

const formatIdentity = (d: number | Date) => `${d}`;

function center(scale: ScaleType) {
  const width = (scale.bandwidth?.() ?? 0) / 2;
  return (d: number | Date) => scale(d) + width;
}

type PositionFn<D> = (d: D) => number;

function translateX<D>(scale0: PositionFn<D>, scale1: PositionFn<D>, d: D) {
  const x = scale0(d);
  return "translate(" + (isFinite(x) ? x : scale1(d)) + ",0)";
}

function translateY<D>(scale0: PositionFn<D>, scale1: PositionFn<D>, d: D) {
  const y = scale0(d);
  return "translate(0," + (isFinite(y) ? y : scale1(d)) + ")";
}

import { Selection } from "d3-selection";
import type { ScaleContinuousNumeric, ScaleLinear, ScaleTime } from "d3-scale";

type ScaleType = (
  | ScaleContinuousNumeric<number, number>
  | ScaleTime<number, number>
  | ScaleLinear<number, number>
) & { bandwidth?: () => number };

export class MyAxis {
  private tickArguments: number[];
  private tickValues: number[] | null;
  private tickFormat: ((d: number | Date) => string) | null;
  private tickSizeInner: number;
  private tickSizeOuter: number;
  private tickPadding: number;
  private orient: Orientation;
  private scale1: ScaleType;
  private scale2: ScaleType | undefined;

  constructor(orient: Orientation, scale1: ScaleType, scale2?: ScaleType) {
    this.orient = orient;
    this.scale1 = scale1;
    this.scale2 = scale2;
    this.tickArguments = [];
    this.tickValues = null;
    this.tickFormat = null;
    this.tickSizeInner = 6;
    this.tickSizeOuter = 6;
    this.tickPadding = 3;
  }

  private primaryTickValue<T>(d: T | [T, number], active: number): T {
    if (Array.isArray(d)) {
      return (d.length > 2 ? d[active] : d[0]) as T;
    }
    return d;
  }

  private tickTransformFn<T>(
    transform: (a: PositionFn<T>, b: PositionFn<T>, c: T) => string,
    positions: PositionFn<T>[],
  ) {
    return (d: T | [T, number]) => {
      const active =
        Array.isArray(d) && d.length === 2 && typeof d[1] === "number"
          ? d[1]
          : 0;
      const pos = positions[active]!;
      return transform(pos, pos, this.primaryTickValue(d, active));
    };
  }

  private createValues(
    scale1: ScaleType,
    scale2?: ScaleType,
  ): [number, number][] {
    const push = (arr: [number, number][], v: number, idx: number) =>
      arr.push([v, idx]);

    const result: [number, number][] = [];

    if (this.tickValues != null) {
      for (const v of this.tickValues) {
        push(result, v, 0);
        if (scale2) {
          push(result, v, 1);
        }
      }
      return result;
    }

    const createValuesFromScale = (scale: ScaleType): number[] => {
      const values = scale.ticks
        ? scale.ticks(...this.tickArguments)
        : scale.domain();
      return values.map((v) => +v);
    };

    for (const v of createValuesFromScale(scale1)) {
      push(result, v, 0);
    }
    if (scale2) {
      for (const v of createValuesFromScale(scale2)) {
        push(result, v, 1);
      }
    }
    return result;
  }

  private createFormat(scale: ScaleType): (d: number | Date) => string {
    const formatValue = (scale: ScaleType): ((d: number | Date) => string) => {
      if (this.tickFormat) {
        return this.tickFormat;
      }
      return scale.tickFormat
        ? (scale.tickFormat(...this.tickArguments) as (
            d: number | Date,
          ) => string)
        : formatIdentity;
    };
    return (d: number | Date) => formatValue(scale)(d);
  }

  axis(context: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const values = this.createValues(this.scale1, this.scale2),
      formats = [this.createFormat(this.scale1)],
      spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
      transform: (
        scale0: PositionFn<number | Date>,
        scale1: PositionFn<number | Date>,
        d: number | Date,
      ) => string =
        this.orient === Orientation.Top || this.orient === Orientation.Bottom
          ? translateX
          : translateY,
      positions: PositionFn<number | Date>[] = [
        (this.scale1.bandwidth ? center : id)(this.scale1.copy()),
      ];
    if (this.scale2) {
      formats.push(this.createFormat(this.scale2));
      positions.push((this.scale2.bandwidth ? center : id)(this.scale2.copy()));
    }
    let tick = context
      .selectAll<SVGGElement, [number, number]>(".tick")
      .data(values, (d: [number, number]) =>
        d[1] === 0 ? this.scale1(d[0]) : (this.scale2 as ScaleType)(d[0]),
      )
      .order();
    const tickExit = tick.exit();
    const tickEnter = tick.enter().append("g").attr("class", "tick");
    let line = tick.select<SVGLineElement>("line");
    let text = tick.select<SVGTextElement>("text");
    const k =
      this.orient === Orientation.Top || this.orient === Orientation.Left
        ? -1
        : 1;
    let x = "";
    const y =
      this.orient === Orientation.Left || this.orient === Orientation.Right
        ? ((x = "x"), "y")
        : ((x = "y"), "x");

    tick = tick.merge(tickEnter);
    line = line.merge(
      tickEnter.append("line").attr(x + "2", k * this.tickSizeInner),
    );

    text = text.merge(tickEnter.append("text").attr(x, k * spacing));

    tickExit.remove();

    tick.attr("transform", this.tickTransformFn(transform, positions));

    line
      .attr(x + "2", k * this.tickSizeInner)
      .attr(y + "1", 0.5)
      .attr(y + "2", 0.5);

    text
      .attr(x, k * spacing)
      .attr(y, 3)
      .attr(
        "dy",
        this.orient === Orientation.Top
          ? "0em"
          : this.orient === Orientation.Bottom
            ? ".41em"
            : ".62em",
      )
      .text((d: [number, number]) => formats[d[1]]!(d[0]));

    context
      .attr(
        "text-anchor",
        this.orient === Orientation.Right
          ? "start"
          : this.orient === Orientation.Left
            ? "end"
            : "middle",
      )
      .each(function (
        this: SVGGElement & { __axis?: PositionFn<number | Date> },
      ) {
        this.__axis = positions[0]!;
      });
  }

  axisUp(context: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    const values = this.createValues(this.scale1, this.scale2),
      formats = [this.createFormat(this.scale1)],
      spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
      transform: (
        scale0: PositionFn<number | Date>,
        scale1: PositionFn<number | Date>,
        d: number | Date,
      ) => string =
        this.orient === Orientation.Top || this.orient === Orientation.Bottom
          ? translateX
          : translateY,
      positions: PositionFn<number | Date>[] = [
        (this.scale1.bandwidth ? center : id)(this.scale1.copy()),
      ],
      k =
        this.orient === Orientation.Top || this.orient === Orientation.Left
          ? -1
          : 1;
    if (this.scale2) {
      formats.push(this.createFormat(this.scale2));
      positions.push((this.scale2.bandwidth ? center : id)(this.scale2.copy()));
    }
    let tick = context
      .selectAll<SVGGElement, [number, number]>(".tick")
      .data(values, (d: [number, number]) =>
        d[1] === 0 ? this.scale1(d[0]) : (this.scale2 as ScaleType)(d[0]),
      )
      .order();
    const tickExit = tick.exit();
    const tickEnter = tick.enter().append("g").attr("class", "tick");
    let line = tick.select<SVGLineElement>("line");
    let text = tick.select<SVGTextElement>("text");

    let x = "";
    const y =
      this.orient === Orientation.Left || this.orient === Orientation.Right
        ? ((x = "x"), "y")
        : ((x = "y"), "x");

    tick = tick.merge(tickEnter);
    line = line.merge(
      tickEnter.append("line").attr(x + "2", k * this.tickSizeInner),
    );

    text = text.merge(tickEnter.append("text").attr(x, k * spacing));

    tickExit.remove();

    tick.attr("transform", this.tickTransformFn(transform, positions));

    line
      .attr(x + "2", k * this.tickSizeInner)
      .attr(y + "1", 0.5)
      .attr(y + "2", 0.5);

    text
      .attr(x, k * spacing)
      .attr(y, 3)
      .attr(
        "dy",
        this.orient === Orientation.Top
          ? "0em"
          : this.orient === Orientation.Bottom
            ? ".41em"
            : ".62em",
      )
      .text((d: [number, number]) => formats[d[1]]!(d[0]));
  }

  setScale(scale1: ScaleType, scale2?: ScaleType): this {
    this.scale1 = scale1;
    this.scale2 = scale2;
    return this;
  }

  ticks(...args: (number | string)[]): this {
    this.tickArguments = args.map((arg) =>
      typeof arg === "string" ? arg : +arg,
    ) as number[];
    return this;
  }

  setTickArguments(args: number[] | null): this {
    this.tickArguments = args == null ? [] : args.slice();
    return this;
  }

  setTickValues(values: number[] | null): this {
    this.tickValues = values == null ? null : values.slice();
    return this;
  }

  setTickFormat(format: ((d: number | Date) => string) | null): this {
    this.tickFormat = format;
    return this;
  }

  setTickSize(size: number): this {
    this.tickSizeInner = this.tickSizeOuter = size;
    return this;
  }

  setTickSizeInner(size: number): this {
    this.tickSizeInner = size;
    return this;
  }

  setTickSizeOuter(size: number): this {
    this.tickSizeOuter = size;
    return this;
  }

  setTickPadding(padding: number): this {
    this.tickPadding = padding;
    return this;
  }
}
