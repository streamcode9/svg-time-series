import type { UserConfig } from "vite";
import { defineConfig } from "vite";
import nodeExternals from "rollup-plugin-node-externals";
import dts from "vite-plugin-dts";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    build: {
      lib: {
        entry: "src/draw.ts",
        fileName: "index",
        formats: ["es"],
      },
      rollupOptions: {
        plugins: [nodeExternals()],
      },
      sourcemap: !isProd,
      minify: isProd ? "esbuild" : false,
    },
    plugins: [dts({ rollupTypes: true })],
  } satisfies UserConfig;
});
