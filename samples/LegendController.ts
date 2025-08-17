import type { Selection } from "d3-selection";
import { select } from "d3-selection";
import { updateNode } from "../svg-time-series/src/utils/domNodeTransform.ts";
import { drawProc } from "../svg-time-series/src/utils/drawProc.ts";
import type {
  ILegendController,
  LegendContext,
} from "../svg-time-series/src/chart/legend.ts";

export class LegendController implements ILegendController {
  private legendTime: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<HTMLElement, unknown, HTMLElement, unknown>;

  private readonly dotRadius = 2;
  private highlightedGreenDot!: SVGCircleElement;
  private highlightedBlueDot!: SVGCircleElement;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;
  private lastHighlightedIdx: number | null = null;
  private lastRenderedIdx: number | null = null;
  private prevTimestamp: number | undefined;
  private prevGreen: number | undefined;
  private prevBlue: number | undefined;
  private context!: LegendContext;
  private scheduleUpdate: () => void;
  private cancelUpdate: () => void;

  constructor(
    legend: Selection<HTMLElement, unknown, HTMLElement, unknown>,
    private formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    const { wrapped, cancel } = drawProc(() => {
      this.update();
    });
    this.scheduleUpdate = wrapped;
    this.cancelUpdate = cancel;
  }

  public init(context: LegendContext): void {
    this.context = context;
    const firstSeries = context.series[0];
    if (!firstSeries) {
      throw new Error("No series available");
    }
    const svg = firstSeries.path.ownerSVGElement;
    if (!svg) {
      throw new Error("SVG element not found");
    }
    const makeDot = (path: SVGPathElement) => {
      const color =
        path.getAttribute("stroke") || getComputedStyle(path).stroke || "black";
      return select(svg)
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", this.dotRadius)
        .attr("fill", color)
        .attr("stroke", color)
        .node() as SVGCircleElement;
    };
    this.highlightedGreenDot = makeDot(firstSeries.path);
    this.highlightedBlueDot = makeDot(
      context.series[1]?.path ?? firstSeries.path,
    );
    if (!context.series[1]) {
      this.highlightedBlueDot.style.display = "none";
    }
  }

  public highlightIndex(idx: number): void {
    const clamped = Math.round(
      Math.min(Math.max(idx, 0), this.context.getLength() - 1),
    );
    if (clamped === this.lastHighlightedIdx) {
      return;
    }
    this.highlightedDataIdx = clamped;
    this.lastHighlightedIdx = clamped;
    this.update();
  }

  public highlightIndexRaf(idx: number): void {
    const clamped = Math.round(
      Math.min(Math.max(idx, 0), this.context.getLength() - 1),
    );
    if (clamped === this.lastHighlightedIdx) {
      return;
    }
    this.highlightedDataIdx = clamped;
    this.lastHighlightedIdx = clamped;
    this.scheduleUpdate();
  }

  public refresh(): void {
    this.scheduleUpdate();
  }

  public clearHighlight(): void {
    this.legendTime.text("");
    this.legendGreen.text("");
    this.legendBlue.text("");
    this.highlightedGreenDot.style.display = "none";
    this.highlightedBlueDot.style.display = "none";
    this.lastHighlightedIdx = null;
    this.lastRenderedIdx = null;
    this.prevTimestamp = undefined;
    this.prevGreen = undefined;
    this.prevBlue = undefined;
  }

  private update() {
    const { values, timestamp } = this.context.getPoint(
      this.highlightedDataIdx,
    ) as { values?: number[]; timestamp?: number };
    if (!values) {
      return;
    }

    const indexChanged = this.lastRenderedIdx !== this.highlightedDataIdx;

    const greenData = values[0];
    const blueData = values[1];
    if (!Object.is(timestamp, this.prevTimestamp)) {
      if (timestamp !== undefined) {
        this.legendTime.text(this.formatTime(timestamp));
      } else {
        this.legendTime.text("");
      }
      this.prevTimestamp = timestamp;
    }

    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const x = this.highlightedDataIdx;
    const updateDot = (
      val: number | undefined,
      legendSel: Selection<HTMLElement, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement,
      transform: { matrix: DOMMatrix },
      prevVal: number | undefined,
      setPrev: (v: number | undefined) => void,
    ) => {
      if (!indexChanged && Object.is(val, prevVal)) {
        return;
      }
      const safeVal = val ?? NaN;
      legendSel.text(fixNaN(safeVal, " "));
      node.style.display = "";
      const point = new DOMPoint(x, fixNaN(safeVal, 0)).matrixTransform(
        transform.matrix,
      );
      updateNode(node, this.identityMatrix.translate(point.x, point.y));
      setPrev(val);
    };

    const firstSeries = this.context.series[0]!;
    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      firstSeries.transform,
      this.prevGreen,
      (v) => (this.prevGreen = v),
    );
    const secondSeries = this.context.series[1];
    if (secondSeries) {
      updateDot(
        blueData,
        this.legendBlue,
        this.highlightedBlueDot,
        secondSeries.transform,
        this.prevBlue,
        (v) => (this.prevBlue = v),
      );
    }
    this.lastRenderedIdx = this.highlightedDataIdx;
  }

  public destroy(): void {
    this.cancelUpdate();
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot.remove();
  }
}
