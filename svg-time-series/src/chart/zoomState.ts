import type { Selection } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import type { D3ZoomEvent, ZoomBehavior, ZoomTransform } from "d3-zoom";
import { ZoomScheduler, sameTransform } from "./zoomScheduler.ts";
import type { RenderState } from "./render.ts";

export { sameTransform };

export const constrainTranslation = (
  current: ZoomTransform,
  width: number,
  height: number,
): ZoomTransform => {
  const x0 = current.invertX(0);
  const x1 = current.invertX(width) - width;
  const y0 = current.invertY(0);
  const y1 = current.invertY(height) - height;
  const tx = x1 > x0 ? (x0 + x1) / 2 : Math.min(0, x0) || Math.max(0, x1);
  const ty = y1 > y0 ? (y0 + y1) / 2 : Math.min(0, y0) || Math.max(0, y1);
  return tx !== 0 || ty !== 0 ? current.translate(tx, ty) : current;
};

export interface IZoomStateOptions {
  scaleExtent: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomScheduler: ZoomScheduler;
  private scaleExtent: [number, number];
  private zoomAreaNode: SVGRectElement | null;
  private getZoomAreaNode(): SVGRectElement | null {
    const node = this.zoomArea.node();
    return node && this.zoomAreaNode ? node : null;
  }

  public static validateScaleExtent(extent: unknown): [number, number] {
    const error = () =>
      new Error(
        `scaleExtent must be two finite, positive numbers where extent[0] < extent[1]. Received: ${Array.isArray(extent) ? `[${extent.join(",")}]` : String(extent)}`,
      );

    if (!Array.isArray(extent) || extent.length !== 2) {
      throw error();
    }

    const [min, max] = extent as [unknown, unknown];

    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      !Number.isFinite(min) ||
      !Number.isFinite(max)
    ) {
      throw error();
    }

    if (min <= 0 || max <= 0) {
      throw error();
    }

    if (min >= max) {
      throw error();
    }

    return [min, max];
  }

  constructor(
    private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private refreshChart: () => void,
    private zoomCallback: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    options: IZoomStateOptions = { scaleExtent: [1, 40] },
  ) {
    this.scaleExtent = ZoomState.validateScaleExtent(options.scaleExtent);
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        this.zoom(event);
      });

    this.zoomArea.call(this.zoomBehavior);

    const zoomAreaNode = this.zoomArea.node();
    if (!zoomAreaNode) {
      throw new Error("zoom area element not found");
    }
    this.zoomAreaNode = zoomAreaNode;

    this.zoomScheduler = new ZoomScheduler((t: ZoomTransform) => {
      this.zoomBehavior.transform(this.zoomArea, t);
    }, this.refreshChart);
  }

  public zoom = (event: D3ZoomEvent<SVGRectElement, unknown>) => {
    this.state.applyZoomTransform(event.transform);
    this.zoomScheduler.zoom(event.transform, event.sourceEvent, event, (e) => {
      this.zoomCallback(e as D3ZoomEvent<SVGRectElement, unknown>);
    });
  };

  public refresh = () => {
    this.zoomScheduler.refresh();
  };

  public setScaleExtent = (extent: [number, number]) => {
    const node = this.getZoomAreaNode();
    if (!node) {
      return;
    }
    this.scaleExtent = ZoomState.validateScaleExtent(extent);
    this.zoomBehavior.scaleExtent(this.scaleExtent);
    const current = zoomTransform(node);
    const [min, max] = this.scaleExtent;
    const clampedK = Math.max(min, Math.min(max, current.k));
    if (clampedK !== current.k) {
      this.zoomBehavior.scaleTo(this.zoomArea, clampedK);
    }
    this.refreshChart();
  };

  public updateExtents = (dimensions: { width: number; height: number }) => {
    const node = this.getZoomAreaNode();
    if (!node) {
      return;
    }
    this.zoomBehavior.scaleExtent(this.scaleExtent).translateExtent([
      [0, 0],
      [dimensions.width, dimensions.height],
    ]);
    const current = zoomTransform(node);
    const constrained = constrainTranslation(
      current,
      dimensions.width,
      dimensions.height,
    );
    if (constrained !== current) {
      this.zoomBehavior.transform(this.zoomArea, constrained);
    }
  };

  public reset = () => {
    this.zoomBehavior.transform(this.zoomArea, zoomIdentity);
  };

  public destroy = () => {
    this.zoomScheduler.destroy();
    this.zoomArea.on(".zoom", null);
    this.zoomBehavior.on("zoom", null);
    this.zoomAreaNode = null;
  };
}

export type { D3ZoomEvent };
