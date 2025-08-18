import type { Selection } from "d3-selection";
import { zoom as d3zoom, zoomIdentity, zoomTransform } from "d3-zoom";
import type { D3ZoomEvent, ZoomBehavior, ZoomTransform } from "d3-zoom";
import { ZoomScheduler, sameTransform } from "./zoomScheduler.ts";
import type { RenderState } from "./render.ts";
import { validateScaleExtent } from "./zoomUtils.ts";

export { sameTransform };

export interface IZoomStateOptions {
  scaleExtent: [number, number];
}

export class ZoomState {
  public zoomBehavior: ZoomBehavior<SVGRectElement, unknown>;
  private zoomScheduler: ZoomScheduler;
  private scaleExtent: [number, number];
  private destroyed = false;
  private readonly constrain = (
    transform: ZoomTransform,
    extent: [[number, number], [number, number]],
    translateExtent: [[number, number], [number, number]],
  ): ZoomTransform => {
    const x0 = transform.invertX(extent[0][0]) - translateExtent[0][0];
    const x1 = transform.invertX(extent[1][0]) - translateExtent[1][0];
    const y0 = transform.invertY(extent[0][1]) - translateExtent[0][1];
    const y1 = transform.invertY(extent[1][1]) - translateExtent[1][1];
    const tx = x1 > x0 ? (x0 + x1) / 2 : Math.min(0, x0) || Math.max(0, x1);
    const ty = y1 > y0 ? (y0 + y1) / 2 : Math.min(0, y0) || Math.max(0, y1);
    return tx !== 0 || ty !== 0 ? transform.translate(tx, ty) : transform;
  };

  public setScaleExtent!: (extent: [number, number]) => void;

  public updateExtents!: (dimensions: {
    width: number;
    height: number;
  }) => void;

  constructor(
    private zoomArea: Selection<SVGRectElement, unknown, HTMLElement, unknown>,
    private state: RenderState,
    private refreshChart: () => void,
    private zoomCallback: (
      event: D3ZoomEvent<SVGRectElement, unknown>,
    ) => void = () => {},
    options: IZoomStateOptions = { scaleExtent: [1, 40] },
  ) {
    this.scaleExtent = validateScaleExtent(options.scaleExtent);
    this.zoomBehavior = d3zoom<SVGRectElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .translateExtent([
        [0, 0],
        [state.dimensions.width, state.dimensions.height],
      ])
      .constrain(this.constrain)
      .on("zoom", (event: D3ZoomEvent<SVGRectElement, unknown>) => {
        this.zoom(event);
      });

    this.zoomArea.call(this.zoomBehavior);

    const zoomAreaNode = this.zoomArea.node();
    if (!zoomAreaNode) {
      throw new Error("zoom area element not found");
    }

    this.setScaleExtent = (extent: [number, number]) => {
      if (this.destroyed) {
        return;
      }
      this.scaleExtent = validateScaleExtent(extent);
      this.zoomBehavior.scaleExtent(this.scaleExtent);
      const current = zoomTransform(zoomAreaNode);
      const [min, max] = this.scaleExtent;
      const clampedK = Math.max(min, Math.min(max, current.k));
      if (clampedK !== current.k) {
        this.zoomBehavior.scaleTo(this.zoomArea, clampedK);
      } else {
        this.refreshChart();
      }
    };

    this.updateExtents = (dimensions: { width: number; height: number }) => {
      if (this.destroyed) {
        return;
      }
      const extent: [[number, number], [number, number]] = [
        [0, 0],
        [dimensions.width, dimensions.height],
      ];
      this.zoomBehavior.scaleExtent(this.scaleExtent).translateExtent(extent);
      const current = zoomTransform(zoomAreaNode);
      const constrained = this.zoomBehavior.constrain()(
        current,
        extent,
        extent,
      );
      if (constrained !== current) {
        this.zoomBehavior.transform(this.zoomArea, constrained);
      }
    };

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

  public reset = () => {
    this.zoomBehavior.transform(this.zoomArea, zoomIdentity);
  };

  public destroy = () => {
    this.destroyed = true;
    this.zoomScheduler.destroy();
    this.zoomArea.on(".zoom", null);
    this.zoomBehavior.on("zoom", null);
  };
}

export type { D3ZoomEvent };
