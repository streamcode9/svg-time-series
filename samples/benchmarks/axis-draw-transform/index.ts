import { select, selectAll } from "d3-selection";

import { measureAll } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

function makeChart() {
  return new TimeSeriesChart(select(this), 1070);
}

selectAll("svg").each(makeChart);
measureAll();
