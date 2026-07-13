import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";
import noDirectQueryInComponents from "./local-rules/no-direct-query-in-components.js";
import allowUnderscoreTypeOnlyImports from "./local-rules/allow-underscore-type-only-imports.js";

export default [
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
      import: importPlugin,
      "jsx-a11y": jsxA11y,
      local: {
        rules: {
          "no-direct-query-in-components": noDirectQueryInComponents,
          "allow-underscore-type-only-imports": allowUnderscoreTypeOnlyImports
        }
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...importPlugin.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "local/no-direct-query-in-components": "error",
      "local/allow-underscore-type-only-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_[A-Za-z0-9].*",
          varsIgnorePattern: "^_[A-Za-z0-9].*",
          caughtErrorsIgnorePattern: "^_[A-Za-z0-9].*"
        }
      ]
    }
  },
  eslintConfigPrettier
];
