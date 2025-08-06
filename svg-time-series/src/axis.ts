export enum Orientation {
  Top,
  Right,
  Bottom,
  Left,
}

const slice = Array.prototype.slice;

const identity = (x: any) => x;

function center(scale: any) {
  const width = scale.bandwidth() / 2;
  return (d: any) => scale(d) + width;
}

function translateX(scale0: any, scale1: any, d: any) {
  const x = scale0(d);
  return "translate(" + (isFinite(x) ? x : scale1(d)) + ",0)";
}

function translateY(scale0: any, scale1: any, d: any) {
  const y = scale0(d);
  return "translate(0," + (isFinite(y) ? y : scale1(d)) + ")";
}

import { Selection } from "d3-selection";

import { ScaleLinear, ScaleTime } from "d3-scale";

type ScaleType = (ScaleLinear<number, number> | ScaleTime<number, number>) & {
  bandwidth?: () => number;
};

export class MyAxis {
  private tickArguments: number[];
  private tickValues: number[] | null;
  private tickFormat: ((d: number) => string) | null;
  private tickSizeInner: number;
  private tickSizeOuter: number;
  private tickPadding: number;
  private orient: Orientation;
  private scale1: ScaleType;
  private scale2?: ScaleType;

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

  private primaryTickValue(d: any, active: number): number {
    if (Array.isArray(d)) {
      return d.length > 2 ? d[active] : d[0];
    }
    return d;
  }

  private tickTransformFn(
    transform: (a: any, b: any, c: any) => string,
    positions: ((d: any) => number)[],
  ) {
    return (d: any) => {
      const active =
        Array.isArray(d) && d.length === 2 && typeof d[1] === "number"
          ? d[1]
          : 0;
      const pos = positions[active];
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
        ? scale.ticks.apply(scale, this.tickArguments)
        : scale.domain();
      return (values as (number | Date)[]).map((v) => +v);
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

  private createFormat(scale: ScaleType): (d: number) => string {
    const formatValue = (scale: ScaleType): ((d: number) => string) => {
      if (this.tickFormat) {
        return this.tickFormat;
      }
      return scale.tickFormat
        ? scale.tickFormat.apply(scale, this.tickArguments)
        : identity;
    };
    return (d: number) => formatValue(scale)(d);
  }

  axis(context: Selection<SVGGElement, unknown, HTMLElement, any>) {
    const values = this.createValues(this.scale1, this.scale2),
      formats = [this.createFormat(this.scale1)],
      spacing: any = Math.max(this.tickSizeInner, 0) + this.tickPadding,
      transform: any =
        this.orient === Orientation.Top || this.orient === Orientation.Bottom
          ? translateX
          : translateY,
      positions: ((d: any) => number)[] = [
        (this.scale1.bandwidth ? center : identity)(this.scale1.copy()),
      ];
    if (this.scale2) {
      formats.push(this.createFormat(this.scale2));
      positions.push(
        (this.scale2.bandwidth ? center : identity)(this.scale2.copy()),
      );
    }
    let tick = context
        .selectAll(".tick")
        .data(values, (d: [number, number]) =>
          d[1] === 0 ? this.scale1(d[0]) : (this.scale2 as ScaleType)(d[0]),
        )
        .order(),
      tickExit = tick.exit(),
      tickEnter = tick.enter().append("g").attr("class", "tick"),
      line = tick.select("line"),
      text = tick.select("text"),
      k =
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
      .text((d: [number, number]) => formats[d[1]](d[0]));

    context
      .attr(
        "text-anchor",
        this.orient === Orientation.Right
          ? "start"
          : this.orient === Orientation.Left
            ? "end"
            : "middle",
      )
      .each(function (this: SVGGElement) {
        (this as any).__axis = positions[0];
      });
  }

  axisUp(context: Selection<SVGGElement, unknown, HTMLElement, any>) {
    const values = this.createValues(this.scale1, this.scale2),
      formats = [this.createFormat(this.scale1)],
      spacing = Math.max(this.tickSizeInner, 0) + this.tickPadding,
      transform =
        this.orient === Orientation.Top || this.orient === Orientation.Bottom
          ? translateX
          : translateY,
      positions: ((d: any) => number)[] = [
        (this.scale1.bandwidth ? center : identity)(this.scale1.copy()),
      ],
      k =
        this.orient === Orientation.Top || this.orient === Orientation.Left
          ? -1
          : 1;
    if (this.scale2) {
      formats.push(this.createFormat(this.scale2));
      positions.push(
        (this.scale2.bandwidth ? center : identity)(this.scale2.copy()),
      );
    }
    let tick = context
        .selectAll(".tick")
        .data(values, (d: [number, number]) =>
          d[1] === 0 ? this.scale1(d[0]) : (this.scale2 as ScaleType)(d[0]),
        )
        .order(),
      tickExit = tick.exit(),
      tickEnter = tick.enter().append("g").attr("class", "tick"),
      line = tick.select("line"),
      text = tick.select("text");

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
      .text((d: [number, number]) => formats[d[1]](d[0]));
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

  setTickFormat(format: ((d: number) => string) | null): this {
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
