import { UserConfig, defineConfig } from "vite";
import nodeExternals from "rollup-plugin-node-externals";
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: "src/draw.ts",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      plugins: [nodeExternals()],
    },
    sourcemap: true,
  },
  plugins: [dts({ rollupTypes: true })],
}) satisfies UserConfig;
