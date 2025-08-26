# SVG DOM Structure

`svg-time-series` builds the following hierarchy inside the target `<svg>` element:

```svg
<svg>
  <g class="view">
    <path />
  </g>
  <!-- one <g class="view"> per series -->
  <rect class="zoom-overlay cursor-grab" />
  <g class="brush-layer" />
</svg>
```

- **`g.view`** – container for a data series. Each group holds a `<path>` node that draws the series line.
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
```
