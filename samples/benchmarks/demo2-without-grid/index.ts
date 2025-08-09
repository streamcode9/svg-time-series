import { measure, measureOnce } from "../bench.ts";
import * as common from "./common.ts";
import { csv } from "d3-request";
import { select, selectAll } from "d3-selection";

const resize: {
  interval: number;
  timer?: number;
  request?: () => void;
  eval?: () => void;
} = { interval: 60 };

csv("../../demos/ny-vs-sf.csv")
  .row((d: { NY: string; SF: string }) => ({
    NY: parseFloat(d.NY.split(";")[0]),
    SF: parseFloat(d.SF.split(";")[0]),
  }))
  .get((error: Error | null, data: { NY: number; SF: number }[]) => {
    if (error != null) console.error("Data can't be downloaded or parsed");
    else {
      common.drawCharts(data);

      resize.request = () => {
        if (resize.timer) clearTimeout(resize.timer);
        resize.timer = setTimeout(resize.eval, resize.interval);
      };
      resize.eval = () => {
        selectAll("svg").remove();
        select(".charts").selectAll("div").append("svg");
        common.drawCharts(data);
      };
      window.addEventListener("resize", resize.request, false);
    }
  });

measure(3, ({ fps }) => {
  document.getElementById("fps").textContent = fps.toFixed(2);
});

measureOnce(60, ({ fps }) => {
  console.log(
    `${window.innerWidth}x${window.innerHeight} FPS = ${fps.toFixed(2)}`,
  );
});
