// @ts-check

import eslint from "@eslint/js";
import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "prefer-const": "off",
      "prefer-spread": "off",
    },
  },
);
