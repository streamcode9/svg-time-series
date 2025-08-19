# svg-time-series

A small library for rendering high-performance SVG time series charts with D3. It exports a single class, `TimeSeriesChart`, which handles drawing, zooming and hover interactions. The library supports an arbitrary number of data series across up to two Y axes (left and right).

## Installation

```sh
npm install svg-time-series
```

## Importing

```ts
import { TimeSeriesChart } from "svg-time-series";
```

## Basic usage

```ts
import { select } from "d3-selection";
import { TimeSeriesChart, IDataSource } from "svg-time-series";
import { LegendController } from "../samples/LegendController"; // example

const svg = select("#chart").append("svg").append("g").attr("class", "view");
const legend = select("#legend");

// example data arrays
const ny = [10, 11];
const sf = [12, 13];
const other = [20, 21];

const source: IDataSource = {
  startTime: Date.now(),
  timeStep: 1000, // time step in ms
  length: ny.length,
  // Assign series 0 and 1 to axis 0, and series 2 to axis 1
  seriesAxes: [0, 0, 1],
  getSeries: (i, seriesIdx) =>
    seriesIdx === 0 ? ny[i] : seriesIdx === 1 ? sf[i] : other[i],
};

const chart = new TimeSeriesChart(
  svg,
  source,
  (state, data) =>
    new LegendController(legend, state, data, (ts) =>
      new Date(ts).toISOString(),
    ),
  () => {},
  () => {},
);
```

When the chart is no longer needed, release its resources by calling
`chart.interaction.dispose()`.

`getSeries` returns a value for the requested series index. Any number of
series may be provided, but each must be assigned to either the left or right Y
axis by specifying 0 or 1 in `seriesAxes`. Axis index `0` corresponds to the
right Y-axis and index `1` to the left. Multiple series can share an axis, and
the length of `seriesAxes` determines how many series are available.

The third argument lets you supply a custom legend controller. See
`samples/LegendController.ts` for a reference implementation.

### Interaction callbacks

Register optional hooks to respond to zooming or brush selection. The current
zoom transform can be queried via `getZoomTransform`.

```ts
chart.interaction.onZoom = () => {
  console.log(chart.interaction.getZoomTransform());
};

chart.interaction.onBrushEnd = (range) => {
  console.log("Selected range", range);
};
```

## Demos

To explore complete examples with zooming and real-time updates, run the demos in [`samples`](../samples).

```sh
cd samples
npx vite
```

Then open `demo1.html` or `demo2.html` in your browser for interactive charts.

## Styling

The chart inserts a transparent `<rect>` with the class `zoom-overlay`
above the plotting area to capture zoom and pan interactions. It uses the
classes `cursor-grab` and `cursor-grabbing` to signal the cursor state while
dragging. Provide CSS rules to style these classes as needed, for example:

```css
.zoom-overlay.cursor-grab {
  cursor: grab;
  pointer-events: all;
}

.zoom-overlay.cursor-grabbing {
  cursor: grabbing;
}
```

Setting `pointer-events: none` on `.zoom-overlay` disables zoom handling so
other interactions (such as brushing) can temporarily take over.
