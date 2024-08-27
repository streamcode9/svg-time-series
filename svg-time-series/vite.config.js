import { resolve } from "path";
import { defineConfig } from "vite";
import nodeExternals from "rollup-plugin-node-externals";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/draw.ts"),
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      plugins: [nodeExternals()],
    },
  },
  plugins: [dts({ rollupTypes: true })],
});
