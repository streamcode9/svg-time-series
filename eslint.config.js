// @ts-check

import tsEslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import vitest from "@vitest/eslint-plugin";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import n from "eslint-plugin-n";

const disableTypeChecked = tsEslint.configs.disableTypeChecked;
const nRecommended = n.configs["flat/recommended"];
const nodeOverride = {
  languageOptions: {
    ...disableTypeChecked.languageOptions,
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
};

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
          "./segment-tree-rmq/tsconfig.test.json",
          "./svg-time-series/tsconfig.json",
          "./svg-time-series/tsconfig.bench.json",
          "./svg-time-series/tsconfig.test.json",
          "./samples/tsconfig.json",
          "./samples/demos/tsconfig.json",
          "./samples/misc/tsconfig.json",
          "./samples/competitors/tsconfig.json",
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
    ignores: ["samples/competitors/**"],
    ...tsEslint.configs.disableTypeChecked,
    rules: {
      ...disableTypeChecked.rules,
    },
  },
  {
    files: ["scripts/**", "**/*.config.*", "**/*.cjs", "**/*.mjs"],
    ...nRecommended,
    settings: {
      node: { version: ">=20.11.0" },
    },
    rules: {
      ...nRecommended.rules,
      "n/no-extraneous-import": "off",
      "n/no-process-exit": "off",
      "n/process-exit-as-throw": "off",
      "n/no-unsupported-features/node-builtins": "off",
    },
  },
    {
      files: ["**/*.cjs", "**/vite.config.ts"],
      ...nodeOverride,
      languageOptions: {
        ...nodeOverride.languageOptions,
        sourceType: "commonjs",
      },
    },
    {
      files: ["**/*.mjs"],
      ...nodeOverride,
      languageOptions: {
        ...nodeOverride.languageOptions,
        sourceType: "module",
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
      globals: { ...globals.browser, d3: "readonly" },
    },
  },
  {
    files: ["**/*.test.ts"],
    ...vitest.configs.recommended,
  },
);
