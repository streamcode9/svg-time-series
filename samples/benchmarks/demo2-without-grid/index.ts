import * as measureFPS from "../../measure.ts";
import * as common from "./common.ts";
import { csv } from "d3-request";
import { select, selectAll } from "d3-selection";

const resize: any = { interval: 60 };

csv("../../demos/ny-vs-sf.csv")
  .row((d: any) => ({
    NY: parseFloat(d.NY.split(";")[0]),
    SF: parseFloat(d.SF.split(";")[0]),
  }))
  .get((error: any, data: any[]) => {
    if (error != null) alert("Data can't be downloaded or parsed");
    else {
      common.drawCharts(data);

      resize.request = () => {
        resize.timer && clearTimeout(resize.timer);
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

measureFPS.measure(3, (fps: any) => {
  document.getElementById("fps").textContent = fps;
});
