# svg-time-series

A small library for rendering high-performance SVG time series charts with D3. It exports a single class, `TimeSeriesChart`, which handles drawing, zooming and hover interactions. The library supports at most two data series.

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

const source: IDataSource = {
  startTime: Date.now(),
  timeStep: 1000, // time step in ms
  length: ny.length,
  seriesCount: 2,
  // Use the left axis for the first series and the right axis for the second
  seriesAxes: [0, 1],
  getSeries: (i, seriesIdx) => (seriesIdx === 0 ? ny[i] : sf[i]),
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

`getSeries` returns a value for the requested series index, while `seriesCount`
declares how many series are available. The library supports at most two series;
additional series are ignored.

The third argument lets you supply a custom legend controller. See
`samples/LegendController.ts` for a reference implementation.

## Demos

To explore complete examples with zooming and real-time updates, run the demos in [`samples`](../samples).

```sh
cd samples
npx vite
```

Then open `demo1.html` or `demo2.html` in your browser for interactive charts.
