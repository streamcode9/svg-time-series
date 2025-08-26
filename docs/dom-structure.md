# SVG DOM Structure

`svg-time-series` builds the following hierarchy inside the target `<svg>` element:

```svg
<svg>
  <g class="view">
    <path />
  </g>
  <!-- one <g class="view"> per series -->
  <g class="axis">...</g> <!-- X axis -->
  <g class="axis">...</g> <!-- one per Y axis -->
  <rect class="zoom-overlay cursor-grab" />
  <g class="brush-layer" />
</svg>
```

- **`g.view`** – container for a data series. Each group holds a `<path>` node that draws the series line.
- **`g.axis`** – axis groups. The first is the bottom X axis. Subsequent groups render Y axes: index `0` on the right and index `1` on the left.
- **`rect.zoom-overlay`** – transparent overlay capturing zoom and pan gestures. The chart toggles `cursor-grab` and `cursor-grabbing` on this element.
- **`g.brush-layer`** – hidden layer activated for rectangular brush selections.

## D3 Selection Examples

```ts
import { select, selectAll } from "d3-selection";

// disable zoom interactions temporarily
select("svg").select("rect.zoom-overlay").style("pointer-events", "none");

// reveal the brush layer and apply custom styling
const brushLayer = select("svg").select("g.brush-layer");
brushLayer.style("display", null).select(".selection").attr("stroke", "red");

// style all series paths
selectAll("g.view > path").attr("stroke", "steelblue").attr("fill", "none");

// dim X-axis labels
select("svg").select("g.axis").selectAll("text").attr("fill", "#777");

// color Y-axis lines
selectAll("g.axis")
  .filter((_, i) => i > 0)
  .selectAll("path, line")
  .attr("stroke", "orange");
```
