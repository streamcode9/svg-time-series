// @ts-check

import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  ...tsEslint.configs.strict,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-useless-constructor": "error",
      "prefer-const": "error",
      "prefer-spread": "error",
    },
  },
  {
    files: ["**/*.test.ts"],
    ...vitest.configs.recommended,
  },
);
