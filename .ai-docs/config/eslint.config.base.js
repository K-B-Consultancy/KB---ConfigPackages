// Org-wide ESLint base config (flat config) — the canonical, executable form of
// .ai-docs/10-stacks/react-base/RULES.md § ESLint. Synced from KB-Documentation;
// do not edit in a client repo — changes arrive via the .ai-docs sync PR.
//
// Wire it up in the monorepo-root eslint.config.js:
//
//   import kbBase from "./.ai-docs/config/eslint.config.base.js";
//   export default [...kbBase /*, app-specific overrides last */];
//
// Required devDependencies at the monorepo root (exact-pinned, per
// .ai-docs/00-org-wide/DEPENDENCIES.md):
//   eslint, typescript-eslint, eslint-plugin-react-hooks,
//   eslint-plugin-import, eslint-plugin-jsx-a11y
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";

import noDirectQueryInComponents from "./eslint-local-rules/no-direct-query-in-components.js";

export default [
  {
    // Generated code is never linted (react-base/RULES.md § API client)
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/.output/**",
      "**/src/generated/**",
      "**/routeTree.gen.ts",
      "**/payload-types.ts",
    ],
  },
  ...tseslint.configs.recommended,
  reactHooks.configs["recommended-latest"],
  jsxA11y.flatConfigs.strict,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      import: importPlugin,
      local: {
        rules: { "no-direct-query-in-components": noDirectQueryInComponents },
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "no-console": "error",
      "import/no-default-export": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          pathGroups: [{ pattern: "@/**", group: "internal" }],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      // Feature isolation: cross-feature imports go through the feature's
      // public API (features/<name>/index.ts), never its internals
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*/*"],
              message:
                "Import from the feature's public API (@/features/<name>) instead of reaching into its internals.",
            },
          ],
        },
      ],
      "local/no-direct-query-in-components": "error",
    },
  },
  {
    // Component files ≤ 200 lines
    files: ["**/*.tsx"],
    rules: {
      "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Hook files ≤ 100 lines (use[A-Z] so api modules like users.ts don't match)
    files: ["**/use[A-Z]*.ts"],
    rules: {
      "max-lines": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Config files are consumed by tools that expect a default export
    files: ["**/*.config.{ts,js,mjs,cjs}", "**/vite.config.ts", "**/playwright.config.ts"],
    rules: {
      "import/no-default-export": "off",
    },
  },
];
