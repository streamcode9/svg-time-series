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

In the demos above, SVG DOM manipulations during grid updates seem to consume at least 20% of drawing time, so further optimization work is possible. Keep watching!

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

| Description | Model | Browser | FPS      | Resolution | CPU | GPU |
| ------------|:-----:|:-------:| --------:|:----------:|:---:|:---:|
|SegmentTree reindexing|Desktop|Chrome|94ms for 1000 repeats||i5-4670|NVIDIA GeForce GTX 660|
|SegmentTree reindexing|Desktop|Firefox|861ms for 1000 repeats||i5-4670|NVIDIA GeForce GTX 660|
|SegmentTree reindexing|Desktop|Edge|1255ms for 1000 repeats||i5-4670|NVIDIA GeForce GTX 660|
|Path drawing and transformation|Desktop|Chrome|60|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Path drawing and transformation|Desktop|Firefox|30|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Path drawing and transformation|Desktop|Edge|60|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Grid drawing and transformation|Desktop|Chrome|59.7|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Grid drawing and transformation|Desktop|Firefox|47|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Grid drawing and transformation|Desktop|Edge|59.7|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Demo2 without grid|Desktop|Chrome|59|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Demo2 without grid|Desktop|Firefox|30|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|Demo2 without grid|Desktop|Edge|59|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SVG path recreation|Desktop|Chrome|52|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SVG path recreation|Desktop|Firefox|22.7|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SVG path recreation|Desktop|Edge|20.3|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SegmentTree Queries|Desktop|Chrome|59.7|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SegmentTree Queries|Desktop|Firefox|27.3|1680×917|i5-4670|NVIDIA GeForce GTX 660|
|SegmentTree Queries|Desktop|Edge|60|1680×917|i5-4670|NVIDIA GeForce GTX 660|

## Build instructions

### Windows

1. Install MSVS 2015 community (make sure you have Update 3 installed)
2. Install Microsoft ASP.NET and Web Tools (if it has not been installed with MSVS 2015)
3. Install latest TypeScript tools for MSVS 2015 2.x.x
4. Install nodejs (npm will be also installed)
5. Open project in VS -> package.json -> Right click -> Restore dependencies
6. Build project

### Unix

1. Install `npm` (node.js is installed as a dependency)
2. In project root `npm install` to install our dependencies (many of them, mostly d3, typescript and build tools)
3. `npm run tsify-demo2`. This step creates `demo2/bundle.js`

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

[d1]: https://bl.ocks.org/streamcode9/raw/0ad51c8422d1b0238f0f8ecce03eea60/
[d2]: https://bl.ocks.org/streamcode9/raw/9fc767e29414c2d90f77da4799b9fdf0/
[d3stock]: http://bl.ocks.org/mbostock/db6b4335bf1662b413e7968910104f0f
