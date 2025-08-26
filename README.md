## svg-time-series

[![Join the chat at https://gitter.im/streamcode9/svg-time-series](https://badges.gitter.im/streamcode9/svg-time-series.svg)](https://gitter.im/streamcode9/svg-time-series?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

D3.js-based SVG time series charts done right to reach 60 FPS. Much much faster pan and zoom than other charts, whether canvas- or SVG-based.

- [demo 1][d1]: 1 grid, 2 series of 1070 points
- [demo 2][d2]: 5 grids, 10 series of 1070 points

Demo 1 reaches 60 FPS on desktops, recent iPhones and top Android phones.
Demo 2 shows 60 FPS on desktops, about 24 FPS on iPhone and about 3 FPS on old and slow LG D90.

In comparison, [dygraphs.org](http://dygraphs.org) library basically never reaches 60 fps. Try to pan their demo at the home page by holding `shift`. Note that the demos above use the same NY vs SF temperature dataset.

D3.js seem slow: [stock D3 panning][d3stock]. But it turns out the SVG rasterization is not the bottleneck. Only 2 issues had to be fixed in that demo to reach 60 fps:

- avoid extra attribute setting on SVG lines of the grid during pan and zoom (partially already in HEAD of d3-axis)
- draw in `d3.timeout()` instead of `d3.zoom()`, that is, avoid drawing more often than screen refreshes

In the demos above, SVG DOM manipulations during grid updates seem to consume at least 20% of drawing time, so further optimization
work is possible. Keep watching!

## Project Structure

This monorepo is organized into several workspaces:

- `svg-time-series/` – core library for high-performance SVG time series charts. See [svg-time-series/README.md](svg-time-series/README.md) for installation and usage details.
- `segment-tree-rmq/` – generic segment tree implementation used for range queries. Its unit tests live in `segment-tree-rmq/src`.
- `samples/` – Vite-powered demos and sample code showcasing the library.

For a guide to the chart's SVG element hierarchy—views, axes, and interaction layers—and examples of selecting or styling nodes with D3, see [docs/dom-structure.md](docs/dom-structure.md).

Run tests and benchmarks from the repository root:

```sh
npm test        # run unit tests
npm run bench   # run micro-benchmarks
```

## Build instructions

- Install Node.js 20.x (npm and npx will also be installed)
- `npm ci` in the project root to install pinned dependencies
- `cd samples; npx vite` to start the dev server
- Open the URL in your browser. The Vite web server doesn't properly handle 404 errors, so if you see a blank page, the URL is likely incorrect.
- Navigate to `demo1.html` or `demo2.html` in the list of links in the browser.

## Benchmarking

- For a performance benchmark of core chart components, open
  `benchmarks/chart-components/index.html` after starting the dev server and
  observe the reported FPS and render time in your browser.
- Run `npm run bench` to execute the Vitest micro-benchmark suite. Results are
  printed to the terminal, showing operations per second and relative
  performance for each test.
- To run automated browser benchmarks with
  [Tachometer](https://github.com/Polymer/tachometer), execute
  `node scripts/run-browser-benchmarks.mjs`. The script measures first
  contentful paint and writes JSON results to `tachometer-results.json`. Inspect
  this file to compare performance across runs.

## Y-axis modes

Charts can display any number of data series. Each series is assigned to a
Y-axis via the `seriesAxes` array. Only two Y axes are supported: index `0`
represents the right axis and index `1` represents the left axis. Series that
share an index use the same scale, computed from the combined minimum and
maximum of every series on that axis.

```ts
import { TimeSeriesChart, IDataSource } from "svg-time-series";
import { LegendController } from "./LegendController"; // implement your own

const source: IDataSource = {
  startTime,
  timeStep,
  length: data.length,
  // Assign the first two series to axis 0 and the third to axis 1.
  seriesAxes: [0, 0, 1],
  getSeries: (i, seriesIdx) => data[i][seriesIdx],
};

const chart = new TimeSeriesChart(
  svg,
  source,
  (state, data) =>
    new LegendController(legend, state, data, (ts) =>
      new Date(ts).toISOString(),
    ),
  onZoom,
  onMouseMove,
);
```

`getSeries` returns the value for the specified series index. `seriesAxes`
maps each series to a Y-axis, and its length determines how many series are
available from the data source.

The third argument creates a legend controller, letting you customize how
legend entries are rendered, including timestamp formatting.

For a chart where all series share one Y-axis, assign each entry in
`seriesAxes` to 0. A single-series chart uses `seriesAxes: [0]` and renders one
path and axis.

### Adjusting zoom extents

You can change the allowed zoom range at runtime by calling
`setScaleExtent` on the chart's interaction API:

```ts
// Allow zoom levels between 1x and 80x
chart.interaction.setScaleExtent([1, 80]);
```

To remove event listeners and DOM nodes when the chart is no longer needed,
call `chart.interaction.dispose()`.

### Listening to interactions

You can react to zoom and brush events without using the lower-level event
emitter. Assign callbacks directly on the interaction API and query the current
zoom state when needed:

```ts
chart.interaction.onZoom = () => {
  console.log(chart.interaction.getZoomTransform());
};

chart.interaction.onBrushEnd = (range) => {
  console.log("Brushed range", range);
};
```

## Secrets of Speed

- No legacy
- Very basic features
- Rasterizer-side coordinate transformations (No JS multiplication loops)
- A Range Minimum Query index for O(log(N)) autoscale (No JS minmax loops)
- No drawing or heavy CPU work in mouse handlers
- Don't change anything more often than once per screen refresh
- Only calculate and apply coordinate transformations in `requestAnimationFrame`
- Take care of `requestAnimationFrame` not firing in background. Don't redraw when in background to save battery.

## Benchmarks

| Description                     |  Model  | Browser |                     FPS | Resolution |   CPU   |          GPU           |
| ------------------------------- | :-----: | :-----: | ----------------------: | :--------: | :-----: | :--------------------: |
| SegmentTree reindexing          | Desktop | Chrome  |   94ms for 1000 repeats |            | i5-4670 | NVIDIA GeForce GTX 660 |
| SegmentTree reindexing          | Desktop | Firefox |  861ms for 1000 repeats |            | i5-4670 | NVIDIA GeForce GTX 660 |
| SegmentTree reindexing          | Desktop |  Edge   | 1255ms for 1000 repeats |            | i5-4670 | NVIDIA GeForce GTX 660 |
| Path drawing and transformation | Desktop | Chrome  |                      60 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Path drawing and transformation | Desktop | Firefox |                      30 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Path drawing and transformation | Desktop |  Edge   |                      60 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Grid drawing and transformation | Desktop | Chrome  |                    59.7 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Grid drawing and transformation | Desktop | Firefox |                      47 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Grid drawing and transformation | Desktop |  Edge   |                    59.7 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Demo2 without grid              | Desktop | Chrome  |                      59 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Demo2 without grid              | Desktop | Firefox |                      30 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| Demo2 without grid              | Desktop |  Edge   |                      59 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SVG path recreation             | Desktop | Chrome  |                      52 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SVG path recreation             | Desktop | Firefox |                    22.7 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SVG path recreation             | Desktop |  Edge   |                    20.3 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SegmentTree Queries             | Desktop | Chrome  |                    59.7 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SegmentTree Queries             | Desktop | Firefox |                    27.3 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |
| SegmentTree Queries             | Desktop |  Edge   |                      60 |  1680×917  | i5-4670 | NVIDIA GeForce GTX 660 |

## Improvements over Stock D3 examples

### competitors/d3-axes-grad

Stock axes panning example and:

- No drawing or heavy CPU work in mouse handlers
- Don't change anything more often than once per screen refresh

### competitors/d3-axes

d3-axes grad and performance improvements of axis not accepted by the upstream

### competitors/d3-zoom-pan

Stock d3 phyllotaxis pan-zoom example plus:

- No drawing or heavy CPU work in mouse handlers
- Don't change anything more often than once per screen refresh

## License

This project is licensed under the [MIT License](LICENSE).

[d1]: https://bl.ocks.org/streamcode9/raw/0ad51c8422d1b0238f0f8ecce03eea60/
[d2]: https://bl.ocks.org/streamcode9/raw/9fc767e29414c2d90f77da4799b9fdf0/
[d3stock]: http://bl.ocks.org/mbostock/db6b4335bf1662b413e7968910104f0f
