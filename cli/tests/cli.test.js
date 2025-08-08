import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

it("exits with non-zero code when command is missing", () => {
  const cliPath = resolve(__dirname, "../bin/vz");
  const result = spawnSync("node", [cliPath], { encoding: "utf8" });
  expect(result.status).not.toBe(0);
});
