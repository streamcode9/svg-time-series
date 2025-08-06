# svg-time-series

A small library for rendering high-performance SVG time series charts with D3. It exports a single class, `TimeSeriesChart`, which handles drawing, zooming and hover interactions.

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
import { TimeSeriesChart } from "svg-time-series";

const svg = select("#chart").append("svg").append("g").attr("class", "view");
const legend = select("#legend");

// example data: [value1, value2]
const data: [number, number][] = [
  [10, 12],
  [11, 13],
];

// The data array must contain at least one entry.

const chart = new TimeSeriesChart(
  svg,
  legend,
  Date.now(),
  1000, // time step in ms
  data,
  (i, arr) => ({ min: arr[i][0], max: arr[i][0] }),
  (i, arr) => ({ min: arr[i][1], max: arr[i][1] }),
  () => {},
  () => {},
  (ts) => new Date(ts).toISOString(),
);
```

The last parameter allows customizing how timestamps appear in the legend. If
omitted, `TimeSeriesChart` uses `toLocaleString`.

## Demos

To explore complete examples with zooming and real-time updates, run the demos in [`samples`](../samples).

```sh
cd samples
npx vite
```

Then open `demo1.html` or `demo2.html` in your browser for interactive charts.
