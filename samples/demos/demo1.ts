import { initDemo } from "./common.ts";

async function init(): Promise<void> {
  await initDemo([0, 0]);
}

void init();
