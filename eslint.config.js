// @ts-check

import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "prefer-const": "warn",
      "prefer-spread": "warn",
    },
  },
  {
    files: ["**/*.test.ts"],
    ...vitest.configs.recommended,
  },
);
