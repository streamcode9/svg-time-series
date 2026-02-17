import { initDemo } from "./common.ts";

async function init(): Promise<void> {
  await initDemo([0, 1]);
}

void init();
