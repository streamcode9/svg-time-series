# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo for high-performance SVG time series charts using D3.js, designed to reach 60 FPS. The project consists of three workspaces:

- **svg-time-series/** - Core library for rendering SVG time series charts
- **segment-tree-rmq/** - Generic segment tree implementation for O(log N) range minimum/maximum queries
- **samples/** - Vite-powered demos and benchmarks

## Build and Development Commands

### Setup

```bash
npm ci                      # Install pinned dependencies (required after clone)
```

### Development

```bash
npm run dev                 # Start Vite dev server for samples (navigate to demo1.html or demo2.html)
cd samples; npx vite       # Alternative way to start dev server
```

### Testing

```bash
npm test                    # Run all unit tests with Vitest (uses --reporter=dot)
npx vitest run svg-time-series/test/chart/render.test.ts  # Run a single test file
npm run typecheck           # Run TypeScript type checking across all workspaces
```

### Linting and Formatting

```bash
npm run lint                # ESLint with max-warnings=0
npm run format              # Format all files with Prettier
npm run format:check        # Check formatting without modifying files
```

### Building

```bash
npm run build               # Build all workspaces
npm run build --workspace=svg-time-series --if-present  # Build specific workspace
```

### Benchmarking

```bash
npm run bench               # Run Vitest micro-benchmarks across workspaces
node scripts/run-browser-benchmarks.mjs  # Run Tachometer browser benchmarks (writes tachometer-results.json)
```

After starting dev server, open `benchmarks/chart-components/index.html` for interactive performance benchmarks showing FPS and render times.

## Architecture

### Core Performance Strategy

The library achieves 60 FPS through several key optimizations:

1. **Rasterizer-side transformations** - Uses SVG `transform` attribute instead of JS coordinate loops
2. **Range Minimum Query index** - `segment-tree-rmq` provides O(log N) autoscaling without minmax loops
3. **Deferred rendering** - Draws in `d3.timeout()` / `requestAnimationFrame`, not directly in mouse handlers
4. **Minimal DOM manipulation** - Avoids setting unchanged SVG attributes during pan/zoom
5. **Background tab handling** - Stops redrawing when in background to save battery

### Key Components

#### TimeSeriesChart (draw.ts)

Main entry point that orchestrates the entire chart. Constructor takes:

- `svg` - D3 selection for target SVG element
- `data` - IDataSource implementation with `startTime`, `timeStep`, `length`, `seriesAxes`, and `getSeries()`
- `legendController` - Custom legend implementation (see samples/LegendController.ts)
- `zoomHandler` - Optional zoom callback
- `mouseMoveHandler` - Optional mouse move callback
- `zoomOptions` - Optional IZoomStateOptions for zoom configuration

Call `chart.interaction.dispose()` to clean up event listeners and DOM nodes.

#### ChartData (chart/data.ts)

Wraps IDataSource and manages data access. Each series is assigned to a Y-axis (0 or 1) via `seriesAxes` array. Axis 0 = right Y-axis, axis 1 = left Y-axis. Multiple series can share an axis, and scales are computed from combined min/max of all series on that axis.

#### RenderState (chart/render.ts)

Manages rendering state including axes, series, and viewport transforms. Handles:

- X-axis (time) and up to 2 Y-axes (value)
- Series rendering via SeriesRenderer
- Axis updates and scale management via AxisManager

#### ZoomState (chart/zoomState.ts)

Manages zoom/pan interactions using d3-zoom. Coordinates with ZoomScheduler to batch updates in requestAnimationFrame. Provides methods:

- `setScaleExtent([min, max])` - Set allowed zoom range
- `resetZoom()` - Return to initial view
- `zoomToTimeWindow(start, end)` - Programmatically zoom to time range

#### SegmentTree (segment-tree-rmq/src/index.ts)

Generic segment tree for range queries. Used for O(log N) autoscaling to find min/max values in visible data window without scanning all points. Constructor takes:

- `data` - Initial array (must have at least one element)
- `op` - Associative operator for combining values
- `identity` - Identity value for the operator

### SVG DOM Structure

The chart builds this hierarchy inside the target `<svg>`:

```
<svg>
  <g class="view">        <!-- One per series -->
    <path />              <!-- Series line -->
  </g>
  <g class="axis">...</g> <!-- X axis (bottom) -->
  <g class="axis">...</g> <!-- Y axes (0=right, 1=left) -->
  <rect class="zoom-overlay cursor-grab" />  <!-- Transparent interaction layer -->
  <g class="brush-layer" />                  <!-- Rectangular brush selection -->
</svg>
```

See docs/dom-structure.md for D3 selection examples and styling patterns.

## Testing Conventions

- Test files use `.test.ts` suffix and live in `test/` directories within each workspace (e.g., `svg-time-series/test/chart/`)
- Benchmark files use `.bench.ts` suffix in `bench/` directories
- Tests use Vitest with JSDOM (`// @vitest-environment jsdom` directive in test files)
- Use `test/setupDom.ts` for DOM polyfills in tests (exports `polyfillDom()`)
- Use `test/domUtils.ts` for test helpers (`createSvg()`, `createDiv()`)
- Test file organization mirrors implementation: component tests like `zoomState.test.ts`, `zoomState.methods.test.ts`, `zoomState.destroy.test.ts` split by concern

## Code Style Notes

- TypeScript with strict mode enabled (`noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)
- ES modules with `.ts` extensions in imports (`import { foo } from "./bar.ts"`)
- Use `import type` for type-only imports (enforced by `@typescript-eslint/consistent-type-imports`)
- Target ES2022 with `bundler` module resolution
- D3.js v3.x packages (d3-zoom, d3-scale, d3-selection, d3-shape, d3-brush, d3-dispatch, d3-timer)
- `geometry-polyfill` for DOMMatrix/DOMPoint support in tests
- ESLint uses flat config with `strictTypeChecked`; `no-explicit-any` is an error, `no-non-null-assertion` is allowed
- Prettier uses default settings

## Commits

This project uses Conventional Commits with commitlint. Husky pre-commit hooks run lint-staged (ESLint + Prettier) automatically, plus `npm run lint`, `npm run typecheck`, and `npm test`.
