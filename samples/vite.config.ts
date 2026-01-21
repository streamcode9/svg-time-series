import path, { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    fs: {
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "svg-time-series": path.resolve(
        __dirname,
        "../svg-time-series/src/draw.ts",
      ),
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        // benchmarks
        "benchmarks-axis-draw-transform": resolve(
          __dirname,
          "benchmarks/axis-draw-transform/index.html",
        ),
        "benchmarks-chart-components": resolve(
          __dirname,
          "benchmarks/chart-components/index.html",
        ),
        "benchmarks-demo2-without-grid": resolve(
          __dirname,
          "benchmarks/demo2-without-grid/index.html",
        ),
        "benchmarks-path-draw-transform-d3": resolve(
          __dirname,
          "benchmarks/path-draw-transform-d3/index.html",
        ),
        "benchmarks-path-incremental-update": resolve(
          __dirname,
          "benchmarks/path-incremental-update/index.html",
        ),
        "benchmarks-path-recreate-dom": resolve(
          __dirname,
          "benchmarks/path-recreate-dom/index.html",
        ),
        "benchmarks-path-segment-recreate-dom": resolve(
          __dirname,
          "benchmarks/path-segment-recreate-dom/index.html",
        ),
        "benchmarks-segment-tree-queries": resolve(
          __dirname,
          "benchmarks/segment-tree-queries/index.html",
        ),
        "benchmarks-segment-tree-reindexing": resolve(
          __dirname,
          "benchmarks/segment-tree-reindexing/index.html",
        ),
        "benchmarks-svg-path-recreation-d3": resolve(
          __dirname,
          "benchmarks/svg-path-recreation-d3/index.html",
        ),
        "benchmarks-viewing-pipeline-transformations": resolve(
          __dirname,
          "benchmarks/viewing-pipeline-transformations/index.html",
        ),
        // competitors
        "competitors-d3-plotly": resolve(
          __dirname,
          "competitors/d3-plotly/index-plotly.html",
        ),
        "competitors-d3-raw": resolve(
          __dirname,
          "competitors/d3-raw/index.html",
        ),
        // demos
        "demos-demo1": resolve(__dirname, "demos/demo1.html"),
        "demos-demo2": resolve(__dirname, "demos/demo2.html"),
        "demos-resetZoom": resolve(__dirname, "demos/resetZoom.html"),
        // misc
        "misc-d3-pan-zoom-vwt": resolve(
          __dirname,
          "misc/d3-pan-zoom-vwt/index.html",
        ),
        // misc-demo2-bug-60 excluded: references non-existent svg-time-series/src/math/affine.ts
        "misc-sine-recreate-dom": resolve(
          __dirname,
          "misc/sine-recreate-dom/index-dom-first-rendering.html",
        ),
        "misc-sine-transform-d3": resolve(
          __dirname,
          "misc/sine-transform-d3/index-dom-d3.html",
        ),
        "misc-sine-transform-dom": resolve(
          __dirname,
          "misc/sine-transform-dom/index-dom.html",
        ),
        // unused
        "unused-d3-axes-grad": resolve(
          __dirname,
          "unused/d3-axes-grad/index.html",
        ),
        "unused-d3-fixedaxis": resolve(
          __dirname,
          "unused/d3-fixedaxis/index.html",
        ),
        "unused-d3-pan-zoom": resolve(
          __dirname,
          "unused/d3-pan-zoom/index.html",
        ),
      },
    },
  },
  plugins: [],
});
