import { select, selectAll } from "d3-selection";
import { measure, measureOnce, onCsv } from "../bench.ts";
import { TimeSeriesChart } from "./draw.ts";

onCsv((data) => {
  const dataLength = data.length;

  const pathsData: any[][] = [[], []];
  let previousPointIsValid = [true, true];
  data.forEach((d: number[], i: number, arr: number[][]) => {
    const y0 = arr[i][0];
    const y1 = arr[i][1];
    const currentPointIsValid = [!isNaN(y0), !isNaN(y1)];

    if (!previousPointIsValid[0] && currentPointIsValid[0]) {
      pathsData[0][i - 1].values[1] = y0;
    }

    if (!previousPointIsValid[1] && currentPointIsValid[1]) {
      pathsData[1][i - 1].values[1] = y1;
    }

    pathsData[0].push({
      type: currentPointIsValid[0] ? "L" : "M",
      values: [i, currentPointIsValid[0] ? y0 : 0],
    });
    pathsData[1].push({
      type: currentPointIsValid[1] ? "L" : "M",
      values: [i, currentPointIsValid[1] ? y1 : 0],
    });

    previousPointIsValid = currentPointIsValid;
  });

  if (!previousPointIsValid[0]) {
    pathsData[0][dataLength - 1].values[1] = pathsData[0][0].values[1];
  }

  if (!previousPointIsValid[1]) {
    pathsData[1][dataLength - 1].values[1] = pathsData[1][0].values[1];
  }

  // Add start points
  pathsData[0].unshift({ type: "M", values: [0, 0] });
  pathsData[1].unshift({ type: "M", values: [0, 0] });

  const drawLine = (pathElement: any, cityIdx: number, chartIdx: number) => {
    if (chartIdx == 0) {
      // Push new point
      const newData: any = { ...pathsData[cityIdx][1] };
      newData.values = newData.values.map((_: any) => _);
      pathsData[cityIdx].push(newData);

      // Remove first value point (second actual point)
      pathsData[cityIdx].splice(1, 1);

      // Recalculate indexes
      pathsData[cityIdx] = pathsData[cityIdx].map((d: any, i: number) => {
        d.values[0] = i - 1;
        return d;
      });

      // Set start point
      pathsData[cityIdx][0].values = [0, pathsData[cityIdx][1].values[1]];
    }

    // Draw
    pathElement.setPathData(pathsData[cityIdx]);
  };

  const path = selectAll("g.view")
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path");

  selectAll("svg").each(function (_: any, i: number) {
    return new TimeSeriesChart(select(this), dataLength, drawLine, i);
  });

  measure(3, ({ fps }) => {
    document.getElementById("fps").textContent = fps.toFixed(2);
  });

  measureOnce(60, ({ fps }) => {
    console.log(
      `${window.innerWidth}x${window.innerHeight} FPS = ${fps.toFixed(2)}`,
    );
  });
});
