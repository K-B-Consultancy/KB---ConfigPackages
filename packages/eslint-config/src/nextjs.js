import importX from 'eslint-plugin-import-x';
import eslintConfigPrettier from 'eslint-config-prettier';
import noDirectQueryInComponents from './local-rules/no-direct-query-in-components.js';
import allowUnderscoreTypeOnlyImports from './local-rules/allow-underscore-type-only-imports.js';
import noConsoleInServerComponents from './local-rules/no-console-in-server-components.js';

/**
 * Next.js flavor of the org base config (see nextjs/RULES.md in KB-Documentation).
 *
 * Unlike index.js, this does NOT register typescript-eslint, jsx-a11y, or
 * react-hooks — eslint-config-next already registers all three under the same
 * plugin keys, and ESLint 9 flat config rejects two different instances of a
 * plugin sharing a key ("Cannot redefine plugin"). Append eslint-config-next
 * (core-web-vitals + typescript) in the app itself; its rules cover the same
 * ground those three plugins would have.
 */
export default [
  {
    ignores: [
      '**/dist/',
      '**/build/',
      '**/.output/',
      '**/coverage/',
      '**/src/generated/',
      '**/routeTree.gen.ts',
      '**/payload-types.ts',
      '**/.next/',
      '**/.turbo/',
      '**/next-env.d.ts'
    ]
  },
  {
    plugins: {
      'import-x': importX,
      local: {
        rules: {
          'no-direct-query-in-components': noDirectQueryInComponents,
          'allow-underscore-type-only-imports': allowUnderscoreTypeOnlyImports,
          'no-console-in-server-components': noConsoleInServerComponents
        }
      }
    },
    rules: {
      ...importX.flatConfigs.recommended.rules,
      'local/no-direct-query-in-components': 'error',
      'local/allow-underscore-type-only-imports': 'error',
      // Datadog RUM only forwards browser console output — Server Components/Route
      // Handlers/Server Actions (the App Router default, no "use client" directive) run
      // on the server, so console calls there go nowhere.
      'local/no-console-in-server-components': 'error',
      // tsc owns module resolution; eslint-config-next's own typescript-eslint
      // registration is what actually type-checks import targets here
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
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    // Hook files ≤ 200 lines (use[A-Z] so api modules like users.ts don't match)
    files: ['**/use[A-Z]*.ts'],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }]
    }
  },
  eslintConfigPrettier
];
