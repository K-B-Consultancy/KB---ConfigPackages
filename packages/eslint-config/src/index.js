import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';
import noDirectQueryInComponents from './local-rules/no-direct-query-in-components.js';
import allowUnderscoreTypeOnlyImports from './local-rules/allow-underscore-type-only-imports.js';
import noConsoleInServerFunctions from './local-rules/no-console-in-server-functions.js';

export default [
  {
    // Generated and build output — never linted (react-base RULES.md lists the same
    // paths for .prettierignore; the ESLint side ships here so clients don't repeat it)
    ignores: [
      '**/dist/',
      '**/build/',
      '**/.output/',
      '**/coverage/',
      '**/src/generated/',
      '**/routeTree.gen.ts',
      '**/payload-types.ts'
    ]
  },
  ...tseslint.configs.recommended,
  // a11y strict is the mechanical form of react-base RULES.md § Accessibility
  jsxA11y.flatConfigs.strict,
  {
    plugins: {
      'react-hooks': reactHooks,
      'import-x': importX,
      local: {
        rules: {
          'no-direct-query-in-components': noDirectQueryInComponents,
          'allow-underscore-type-only-imports': allowUnderscoreTypeOnlyImports,
          // Registered here (not enabled) so tanstack-start.js can turn it on without
          // re-declaring the "local" plugin object — flat config forbids redefining a
          // plugin key with a different object once a flavor spreads this config.
          'no-console-in-server-functions': noConsoleInServerFunctions
        }
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...importX.flatConfigs.recommended.rules,
      'local/no-direct-query-in-components': 'error',
      'local/allow-underscore-type-only-imports': 'error',
      // tsc owns module resolution (typecheck is a required CI gate in every client);
      // these two need a filesystem resolver that can't see TS paths without an extra
      // native dependency, and only produce false positives in TS projects
      'import-x/no-unresolved': 'off',
      'import-x/named': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_[A-Za-z0-9].*',
          varsIgnorePattern: '^_[A-Za-z0-9].*',
          caughtErrorsIgnorePattern: '^_[A-Za-z0-9].*'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // One bucket, purely alphabetical — no group separation or blank lines.
      // Side-effect-only imports (import "./x.css") are never reordered by this rule.
      'import-x/order': [
        'error',
        {
          groups: [
            ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'unknown']
          ],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ],
      // Feature isolation: cross-feature imports go through the feature's
      // public API (features/<name>/index.ts), never its internals
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message:
                "Import from the feature's public API (@/features/<name>) instead of reaching into its internals."
            }
          ]
        }
      ]
    }
  },
  {
    // Component files ≤ 300 lines — split components, don't restructure to dodge the cap
    files: ['**/*.tsx'],
    rules: {
      'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Hook files ≤ 200 lines (use[A-Z] so api modules like users.ts don't match)
    files: ['**/use[A-Z]*.ts'],
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Config files are consumed by tools that expect a default export
    files: ['**/*.config.{ts,js,mjs,cjs}', '**/vite.config.ts', '**/playwright.config.ts'],
    rules: {
      'no-restricted-exports': 'off'
    }
  },
  eslintConfigPrettier
];
