// @ts-check

import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";

const disableTypeChecked = tsEslint.configs.disableTypeChecked;

export default tsEslint.config(
  {
    ignores: ["**/dist/**"],
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./segment-tree-rmq/tsconfig.json",
          "./segment-tree-rmq/tsconfig.bench.json",
          "./svg-time-series/tsconfig.json",
          "./svg-time-series/tsconfig.bench.json",
          "./samples/tsconfig.json",
          "./samples/demos/tsconfig.json",
          "./samples/misc/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tsEslint.configs.recommendedTypeChecked,
  ...tsEslint.configs.strictTypeChecked,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-useless-constructor": "error",
      "prefer-const": "error",
      "prefer-spread": "error",
    },
  },
  { files: ["test/**/*.ts"], ...tsEslint.configs.disableTypeChecked },
  { files: ["samples/benchmarks/**"], ...tsEslint.configs.disableTypeChecked },
  { files: ["**/*.cjs", "**/*.mjs", "**/vite.config.ts"], ...tsEslint.configs.disableTypeChecked },
  { files: ["eslint.config.js"], ...tsEslint.configs.disableTypeChecked },
  {
    files: ["samples/competitors/**"],
    languageOptions: {
      ...disableTypeChecked.languageOptions,
      globals: { ...globals.browser, d3: "readonly" },
    },
    rules: {
      ...disableTypeChecked.rules,
      "prefer-const": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-spread": "off",
    },
  },
  { files: ["**/*.test.ts"], ...vitest.configs.recommended, ...tsEslint.configs.disableTypeChecked },
);
