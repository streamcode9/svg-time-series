import type { Selection } from "d3-selection";
import { select } from "d3-selection";
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
  private highlightedBlueDot!: SVGCircleElement;

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
    this.highlightedBlueDot.style.display = "none";
  }

  private update() {
    const rawPoint = this.context.getPoint(this.highlightedDataIdx);
    let values: number[];
    let timestamp: number;

    if (Array.isArray(rawPoint)) {
      [timestamp, ...values] = rawPoint;
    } else if ("values" in rawPoint) {
      ({ timestamp, values } = rawPoint as {
        timestamp: number;
        values: number[];
      });
    } else {
      return;
    }

    const greenData = values[0];
    const blueData = values[1];
    this.legendTime.text(this.formatTime(timestamp));

    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const x = this.highlightedDataIdx;
    const updateDot = (
      val: number | undefined,
      legendSel: Selection<HTMLElement, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement,
      transform: { matrix: DOMMatrix },
    ) => {
      const safeVal = val ?? NaN;
      legendSel.text(fixNaN(safeVal, " "));
      node.style.display = "";
      const point = new DOMPoint(x, fixNaN(safeVal, 0)).matrixTransform(
        transform.matrix,
      );
      updateNode(node, this.identityMatrix.translate(point.x, point.y));
    };

    const firstSeries = this.context.series[0]!;
    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      firstSeries.transform,
    );
    const secondSeries = this.context.series[1];
    if (secondSeries) {
      updateDot(
        blueData,
        this.legendBlue,
        this.highlightedBlueDot,
        secondSeries.transform,
      );
    }
  }

  public destroy(): void {
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot.remove();
  }
}
