import { Selection, select } from "d3-selection";
import { drawProc } from "../svg-time-series/src/utils/drawProc.ts";
import { updateNode } from "../svg-time-series/src/utils/domNodeTransform.ts";
import type { ChartData } from "../svg-time-series/src/chart/data.ts";
import type { RenderState } from "../svg-time-series/src/chart/render.ts";
import type { ILegendController } from "../svg-time-series/src/chart/legend.ts";

export class LegendController implements ILegendController {
  private legendTime: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<HTMLElement, unknown, HTMLElement, unknown>;

  private readonly dotRadius = 2;
  private highlightedGreenDot: SVGCircleElement;
  private highlightedBlueDot: SVGCircleElement | null;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;
  private scheduleRefresh: () => void;
  private cancelRefresh: () => void;

  constructor(
    legend: Selection<HTMLElement, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private data: ChartData,
    private formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    const svg = state.paths.viewNy.ownerSVGElement!;
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
    this.highlightedGreenDot = makeDot(
      state.paths.viewNy.querySelector("path") as SVGPathElement,
    );
    this.highlightedBlueDot = state.paths.viewSf
      ? makeDot(state.paths.viewSf.querySelector("path") as SVGPathElement)
      : null;

    const { wrapped, cancel } = drawProc(() => {
      this.update();
    });
    this.scheduleRefresh = wrapped;
    this.cancelRefresh = cancel;
  }

  public highlightIndex(idx: number): void {
    this.highlightedDataIdx = Math.min(Math.max(idx, 0), this.data.length - 1);
    this.scheduleRefresh();
  }

  public refresh(): void {
    this.scheduleRefresh();
  }

  public clearHighlight(): void {
    this.cancelRefresh();
    this.legendTime.text("");
    this.legendGreen.text("");
    this.legendBlue.text("");
    this.highlightedGreenDot.style.display = "none";
    if (this.highlightedBlueDot) {
      this.highlightedBlueDot.style.display = "none";
    }
  }

  private update() {
    const {
      ny: greenData,
      sf: blueData,
      timestamp,
    } = this.data.getPoint(this.highlightedDataIdx);
    this.legendTime.text(this.formatTime(timestamp));

    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const screenX = this.state.scales.x(timestamp);
    const updateDot = (
      val: number,
      legendSel: Selection<HTMLElement, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement | null,
      yScale: (n: number) => number,
    ) => {
      legendSel.text(fixNaN(val, " "));
      if (node) {
        node.style.display = "";
        const y = yScale(fixNaN(val, 0) as number);
        const ySafe = isNaN(y) ? 0 : this.state.dimensions.height - y;
        updateNode(node, this.identityMatrix.translate(screenX, ySafe));
      }
    };

    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      this.state.scales.yNy,
    );
    if (this.highlightedBlueDot) {
      updateDot(
        blueData as number,
        this.legendBlue,
        this.highlightedBlueDot,
        this.state.scales.ySf ?? this.state.scales.yNy,
      );
    }
  }

  public destroy(): void {
    this.cancelRefresh();
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot?.remove();
  }
}
