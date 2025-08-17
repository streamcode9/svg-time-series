import { loadAndDraw } from "./common.ts";

void loadAndDraw([0, 1]).then((charts) => {
  charts.forEach((c) => {
    c.interaction.onHover(0);
  });
  const resetButton = document.getElementById("reset-zoom");
  resetButton?.addEventListener("click", () => {
    charts.forEach((c) => {
      c.interaction.resetZoom();
    });
  });

  const brushButton = document.getElementById("toggle-brush");
  if (brushButton) {
    let brushEnabled = false;
    brushButton.addEventListener("click", () => {
      brushEnabled = !brushEnabled;
      charts.forEach((c) => {
        if (brushEnabled) {
          c.interaction.enableBrush();
        } else {
          c.interaction.disableBrush();
        }
      });
      brushButton.textContent = brushEnabled ? "Disable Brush" : "Enable Brush";
    });
  }
});
