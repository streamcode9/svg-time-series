import { loadAndDraw } from "./common.ts";

// Demo entry for testing chart reset logic. Uses the updated IDataSource API.
// A button with id 'reset-zoom' will redraw the charts to simulate a reset.
void loadAndDraw([0, 0]);

document.getElementById("reset-zoom")?.addEventListener("click", () => {
  void loadAndDraw([0, 0]);
});
