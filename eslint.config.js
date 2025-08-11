// @ts-check

import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";

export default tsEslint.config(
  {
    ignores: [
      "eslint.config.js",
      "**/dist/**",
      "samples/benchmarks/**",
      "samples/competitors/**",
      "samples/unused/**",
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: [
          "./segment-tree-rmq/tsconfig.json",
          "./svg-time-series/tsconfig.json",
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
  { files: ["**/*.bench.ts", "**/bench/**/*.ts"], ...tsEslint.configs.disableTypeChecked },
  { files: ["**/*.cjs", "**/*.mjs", "**/vite.config.ts"], ...tsEslint.configs.disableTypeChecked },
  { files: ["**/*.test.ts"], ...vitest.configs.recommended, ...tsEslint.configs.disableTypeChecked },
);
