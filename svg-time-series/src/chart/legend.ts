import { BaseType, Selection, select } from "d3-selection";
import { drawProc } from "../utils/drawProc.ts";
import { updateNode } from "../utils/domNodeTransform.ts";
import type { ChartData } from "./data.ts";
import type { RenderState } from "./render.ts";

export class LegendController {
  private legendTime: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendGreen: Selection<BaseType, unknown, HTMLElement, unknown>;
  private legendBlue: Selection<BaseType, unknown, HTMLElement, unknown>;

  private readonly dotRadius = 3;
  private highlightedGreenDot: SVGCircleElement;
  private highlightedBlueDot: SVGCircleElement | null;

  private identityMatrix = document
    .createElementNS("http://www.w3.org/2000/svg", "svg")
    .createSVGMatrix();

  private highlightedDataIdx = 0;
  private scheduleRefresh: () => void;

  constructor(
    legend: Selection<BaseType, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private data: ChartData,
    private formatTime: (timestamp: number) => string = (timestamp) =>
      new Date(timestamp).toLocaleString(),
  ) {
    this.legendTime = legend.select(".chart-legend__time");
    this.legendGreen = legend.select(".chart-legend__green_value");
    this.legendBlue = legend.select(".chart-legend__blue_value");

    const makeDot = (view: SVGGElement) =>
      select(view)
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 1)
        .node() as SVGCircleElement;
    this.highlightedGreenDot = makeDot(state.paths.viewNy);
    this.highlightedBlueDot = state.paths.viewSf
      ? makeDot(state.paths.viewSf)
      : null;

    this.scheduleRefresh = drawProc(() => {
      this.update();
    });
  }

  public onHover = (idx: number) => {
    this.highlightedDataIdx = Math.min(
      Math.max(idx, 0),
      this.data.data.length - 1,
    );
    this.scheduleRefresh();
  };

  public refresh = () => {
    this.scheduleRefresh();
  };

  private update() {
    const [greenData, blueData] =
      this.data.data[Math.round(this.highlightedDataIdx)];
    const timestamp = this.data.idxToTime.applyToPoint(this.highlightedDataIdx);
    this.legendTime.text(this.formatTime(timestamp));

    const dotScaleMatrixNy = this.state.transforms.ny.dotScaleMatrix(
      this.dotRadius,
    );
    const dotScaleMatrixSf = this.state.transforms.sf?.dotScaleMatrix(
      this.dotRadius,
    );
    const fixNaN = <T>(n: number, valueForNaN: T): number | T =>
      isNaN(n) ? valueForNaN : n;
    const updateDot = (
      val: number,
      legendSel: Selection<BaseType, unknown, HTMLElement, unknown>,
      node: SVGGraphicsElement | null,
      dotScaleMatrix?: SVGMatrix,
    ) => {
      legendSel.text(fixNaN(val, " "));
      if (node && dotScaleMatrix) {
        updateNode(
          node,
          this.identityMatrix
            .translate(this.highlightedDataIdx, fixNaN(val, 0))
            .multiply(dotScaleMatrix),
        );
      }
    };

    updateDot(
      greenData,
      this.legendGreen,
      this.highlightedGreenDot,
      dotScaleMatrixNy,
    );
    if (this.state.transforms.sf) {
      updateDot(
        blueData as number,
        this.legendBlue,
        this.highlightedBlueDot,
        dotScaleMatrixSf,
      );
    }
  }

  public destroy = () => {
    this.highlightedGreenDot.remove();
    this.highlightedBlueDot?.remove();
  };
}
