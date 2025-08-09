import { Selection, select } from "d3-selection";
import { updateNode } from "../svg-time-series/src/utils/domNodeTransform.ts";
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
  private highlightedBlueDot: SVGCircleElement | null = null;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;
  private context!: LegendContext;

  constructor(
    legend: Selection<HTMLElement, unknown, HTMLElement, unknown>,
    private formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");
  }

  public init(context: LegendContext): void {
    this.context = context;
    const svg = context.series[0].path.ownerSVGElement as SVGSVGElement;
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
    this.highlightedGreenDot = makeDot(context.series[0].path);
    this.highlightedBlueDot = context.series[1]
      ? makeDot(context.series[1].path)
      : null;
  }

  public highlightIndex(idx: number): void {
    this.highlightedDataIdx = Math.round(
      Math.min(Math.max(idx, 0), this.context.length - 1),
    );
    this.update();
  }

  public refresh(): void {
    this.update();
  }

  public clearHighlight(): void {
    this.legendTime.text("");
    this.legendGreen.text("");
    this.legendBlue.text("");
    this.highlightedGreenDot.style.display = "none";
    if (this.highlightedBlueDot) {
      this.highlightedBlueDot.style.display = "none";
    }
  }

  private update() {
    const rawPoint = this.context.getPoint(this.highlightedDataIdx) as unknown;
    let values: number[] | undefined;
    let timestamp: number | undefined;
    if (Array.isArray(rawPoint)) {
      const arr = rawPoint as number[];
      timestamp = arr[0];
      values = arr.slice(1);
    } else if (
      rawPoint &&
      typeof rawPoint === "object" &&
      "values" in (rawPoint as Record<string, unknown>) &&
      "timestamp" in (rawPoint as Record<string, unknown>)
    ) {
      ({ values, timestamp } = rawPoint as {
        values: number[];
        timestamp: number;
      });
    }
    if (!values || timestamp === undefined) {
      return;
    }
    const greenData = values[0];
    const blueData = values[1];
    this.legendTime.text(this.formatTime(timestamp));

    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const x = this.highlightedDataIdx;
    const updateDot = (
      val: number,
      legendSel: Selection<HTMLElement, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement | null,
      transform: { matrix: DOMMatrix },
    ) => {
      legendSel.text(fixNaN(val, " "));
      if (node) {
        node.style.display = "";
        const point = new DOMPoint(x, fixNaN(val, 0) as number).matrixTransform(
          transform.matrix,
        );
        updateNode(node, this.identityMatrix.translate(point.x, point.y));
      }
    };

    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      this.context.series[0].transform,
    );
    if (this.highlightedBlueDot) {
      const tf =
        this.context.series[1]?.transform ?? this.context.series[0].transform;
      updateDot(
        blueData as number,
        this.legendBlue,
        this.highlightedBlueDot,
        tf,
      );
    }
  }

  public destroy(): void {
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot?.remove();
  }
}
