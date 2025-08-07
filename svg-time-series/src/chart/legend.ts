import { Selection, select } from "d3-selection";
import { drawProc } from "../utils/drawProc.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import type { ChartData } from "./data.ts";
import type { RenderState } from "./render.ts";

export class LegendController {
  private legendTime: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<HTMLElement, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<HTMLElement, unknown, HTMLElement, unknown>;

  private readonly dotRadius = 3;
  private highlightedGreenDot: SVGCircleElement;
  private highlightedBlueDot: SVGCircleElement | null;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;
  private scheduleRefresh: () => void;

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
    const makeDot = () =>
      select(svg)
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", this.dotRadius)
        .node() as SVGCircleElement;
    this.highlightedGreenDot = makeDot();
    this.highlightedBlueDot = state.paths.viewSf ? makeDot() : null;

    this.scheduleRefresh = drawProc(() => {
      this.update();
    });
  }

  public onHover = (idx: number) => {
    this.highlightedDataIdx = Math.min(Math.max(idx, 0), this.data.length - 1);
    this.scheduleRefresh();
  };

  public refresh = () => {
    this.scheduleRefresh();
  };

  private update() {
    const {
      values: [greenData, blueData],
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
        const y = yScale(fixNaN(val, 0) as number);
        const ySafe = isNaN(y) ? 0 : y;
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

  public destroy = () => {
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot?.remove();
  };
}
