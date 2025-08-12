// @ts-check

import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";
import importPlugin from "eslint-plugin-import";

const disableTypeChecked = tsEslint.configs.disableTypeChecked;

export default tsEslint.config(
  {
    ignores: ["**/dist/**", "samples/unused/**"],
  },
  {
    settings: { "import/resolver": { typescript: {} } },
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
          "./test/tsconfig.json",
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tsEslint.configs.recommendedTypeChecked,
  ...tsEslint.configs.strictTypeChecked,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    prettierConfig,
  {
    rules: {
      "import/no-unresolved": "error",
      "import/order": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unsafe-function-type": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-useless-constructor": "error",
      "prefer-const": "error",
      "prefer-spread": "error",
    },
  },
  {
    files: ["samples/**"],
    ...tsEslint.configs.disableTypeChecked,
    rules: {
      ...disableTypeChecked.rules,
    },
  },
    {
      files: ["**/*.cjs", "**/*.mjs", "**/vite.config.ts"],
      languageOptions: {
        ...disableTypeChecked.languageOptions,
        sourceType: "commonjs",
        globals: globals.node,
      },
      rules: {
        ...disableTypeChecked.rules,
        "import/no-unresolved": "off",
        "import/order": "off",
        "import/default": "off",
        "import/no-named-as-default-member": "off",
        "import/no-named-as-default": "off",
      },
    },
  {
    files: ["eslint.config.js"],
    ...tsEslint.configs.disableTypeChecked,
      rules: {
        ...disableTypeChecked.rules,
        "import/no-unresolved": "off",
        "import/order": "off",
        "import/default": "off",
        "import/no-named-as-default-member": "off",
        "import/no-named-as-default": "off",
      },
  },
  {
    files: ["samples/competitors/**"],
    languageOptions: {
      ...disableTypeChecked.languageOptions,
      globals: { ...globals.browser, d3: "readonly" },
    },
    rules: {
      ...disableTypeChecked.rules,
    },
  },
  {
    files: ["**/*.test.ts"],
    ...vitest.configs.recommended,
    ...tsEslint.configs.disableTypeChecked,
    rules: {
      ...disableTypeChecked.rules,
    },
  },
);
