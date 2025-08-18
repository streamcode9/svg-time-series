import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    fs: {
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "svg-time-series": path.resolve(
        __dirname,
        "../svg-time-series/src/draw.ts",
      ),
    },
  },
  build: {
    outDir: "dist",
  },
  plugins: [],
});
