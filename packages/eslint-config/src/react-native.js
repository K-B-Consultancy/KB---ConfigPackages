import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import importX from 'eslint-plugin-import-x';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactNativePlugin from '@react-native/eslint-plugin';
import reactNativeCommunityPlugin from 'eslint-plugin-react-native';
import noDirectQueryInComponents from './local-rules/no-direct-query-in-components.js';
import allowUnderscoreTypeOnlyImports from './local-rules/allow-underscore-type-only-imports.js';

/**
 * React Native flavor of the org base config (see react-native/RULES.md in KB-Documentation).
 *
 * Unlike tanstack-start.js, this does NOT spread index.js: jsx-a11y's rules target DOM
 * elements (img, a, label...) that don't exist in React Native, and some rules key off
 * prop names alone — jsx-a11y/no-autofocus would false-positive on RN's own TextInput
 * autoFocus prop. Everything else index.js enforces is duplicated here instead.
 */
export default [
  {
    ignores: [
      '**/dist/',
      '**/build/',
      '**/coverage/',
      '**/src/generated/',
      '**/ios/',
      '**/android/',
      '**/.expo/',
      '**/.expo-shared/',
      '**/web-build/'
    ]
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      'import-x': importX,
      '@react-native': reactNativePlugin,
      'react-native': reactNativeCommunityPlugin,
      local: {
        rules: {
          'no-direct-query-in-components': noDirectQueryInComponents,
          'allow-underscore-type-only-imports': allowUnderscoreTypeOnlyImports
        }
      }
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...importX.flatConfigs.recommended.rules,
      'local/no-direct-query-in-components': 'error',
      'local/allow-underscore-type-only-imports': 'error',
      // tsc owns module resolution (typecheck is a required CI gate in every client)
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
      ],
      // Official RN rules: catches deep imports into RN internals and invalid
      // PlatformColor/DynamicColorIOS arguments
      '@react-native/no-deep-imports': 'error',
      '@react-native/platform-colors': 'error',
      // eslint-plugin-react-native's other rules (no-unused-styles, split-platform-components,
      // no-single-element-style-arrays) call deprecated context methods ESLint 10 removed and
      // crash outright — no-raw-text is the one rule in the package that doesn't. Revisit the
      // rest once upstream ships an ESLint-10-compatible release.
      // Raw text outside <Text> throws at runtime; if you wrap <Text> in a design-system
      // component (e.g. <AppText>), add it via an app-level `skip` option override
      'react-native/no-raw-text': 'error'
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
