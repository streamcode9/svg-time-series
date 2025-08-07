import { Selection, select, selectAll } from "d3-selection";
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

  const dataPointsCount: [number, number] = [0, 0];
  const lastDataPoint: [any, any] = [{}, {}];
  const newData: [any, any] = [{}, {}];
  const drawLine = (pathElement: any, cityIdx: number, chartIdx: number) => {
    // Change data ones per iteration for all charts
    if (chartIdx == 0) {
      dataPointsCount[cityIdx] = pathsData[cityIdx].length;
      lastDataPoint[cityIdx] = pathsData[cityIdx][dataPointsCount[0] - 1];

      // Push new data point
      newData[cityIdx] = { ...pathsData[cityIdx][0] };
      newData[cityIdx].values = [
        lastDataPoint[cityIdx].values[0] + 1,
        newData[cityIdx].values[1],
      ];
      pathsData[cityIdx].push(newData[cityIdx]);

      // Remove first data point
      pathsData[cityIdx].shift();
    }

    // Draw new point
    const point =
      newData[cityIdx].type == "M"
        ? pathElement.createSVGPathSegMovetoAbs(
            newData[cityIdx].values[0],
            newData[cityIdx].values[1],
          )
        : pathElement.createSVGPathSegLinetoAbs(
            newData[cityIdx].values[0],
            newData[cityIdx].values[1],
          );
    pathElement.pathSegList.appendItem(point);

    // Change start point
    pathElement.pathSegList.replaceItem(
      pathElement.createSVGPathSegMovetoAbs(
        pathsData[cityIdx][0].values[0],
        pathsData[cityIdx][0].values[1],
      ),
      0,
    );
    pathElement.pathSegList.removeItem(1);
  };

  const path = selectAll("g.view")
    .selectAll("path")
    .data([0, 1])
    .enter()
    .append("path");

  selectAll("svg").each(function (_: any, i: number) {
    // Draw paths
    const svg = select(this);
    const paths: Selection<any, any, any, any> = svg
      .select("g.view")
      .selectAll("path");
    paths.each(function (cityIdx: number) {
      const pathElement = this;

      pathElement.pathSegList.appendItem(
        pathElement.createSVGPathSegMovetoAbs(
          0,
          pathsData[cityIdx][0].values[1],
        ),
      );

      pathsData[cityIdx].forEach((d: any, i: number) => {
        const point =
          d.type == "M"
            ? pathElement.createSVGPathSegMovetoAbs(i, d.values[1])
            : pathElement.createSVGPathSegLinetoAbs(i, d.values[1]);
        pathElement.pathSegList.appendItem(point);
      });
    });

    return new TimeSeriesChart(svg, dataLength, drawLine, i);
  });

  measure(3, (fps) => {
    document.getElementById("fps").textContent = fps;
  });

  measureOnce(60, (fps) => {
    alert(`${window.innerWidth}x${window.innerHeight} FPS = ${fps}`);
  });
});
