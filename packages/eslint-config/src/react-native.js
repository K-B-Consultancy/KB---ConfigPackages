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

// Feature isolation: cross-feature imports go through the feature's public API
// (features/<name>/index.ts), never its internals. Same rule the base config applies.
const featureIsolationPattern = {
  group: ['@/features/*/*'],
  message:
    "Import from the feature's public API (@/features/<name>) instead of reaching into its internals."
};

// @expo/vector-icons is the single icon source in Expo apps. react-native-vector-icons
// ships its own fonts that Expo doesn't bundle, so its glyphs render as '?' at runtime.
const restrictedIconMessage =
  "Use @expo/vector-icons, not react-native-vector-icons — Expo doesn't bundle the latter's fonts, so its glyphs render as '?' at runtime.";

// The HTTP client is constructed and configured in exactly one place: the app's api layer
// (src/api, or features/<name>/api). Interceptors — Bearer injection, silent token refresh,
// session-expiry handling — live with the client so every request goes through them. Screens,
// hooks, and contexts import the wrapped client from that layer, never `axios` itself. This is
// the transport-level companion to react-base's `local/no-direct-query-in-components`, and it is
// relaxed for `**/api/**` by the override block below. See react-native/RULES.md § API client.
const restrictedHttpClientMessage =
  "Don't import axios directly outside the api layer. The configured client (Bearer auth + refresh interceptors) lives in src/api / features/<name>/api — import it from there.";

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
      // import-x's static resolver tries to parse react-native's own Flow-syntax entry point
      // (node_modules/react-native/index.js) and crashes outright ("Expression expected" — Flow's
      // `import typeof * as X` isn't valid JS/TS). Same rationale as the two `off`s above: tsc owns
      // resolution, so these resolver-dependent rules only produce false positives / crashes in RN.
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
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
      // Feature isolation + single icon source + HTTP client confined to the api layer.
      // See the const definitions at the top of this file for the rationale of each entry.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'axios', message: restrictedHttpClientMessage },
            { name: 'react-native-vector-icons', message: restrictedIconMessage }
          ],
          patterns: [
            featureIsolationPattern,
            { group: ['react-native-vector-icons/*'], message: restrictedIconMessage }
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
    // The api layer is the one place allowed to import axios directly (it constructs and
    // configures the client). Re-declare no-restricted-imports here WITHOUT the axios entry —
    // ESLint replaces the rule config per file glob rather than merging, so the feature-isolation
    // and icon restrictions have to be restated to survive.
    files: ['**/api/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'react-native-vector-icons', message: restrictedIconMessage }],
          patterns: [
            featureIsolationPattern,
            { group: ['react-native-vector-icons/*'], message: restrictedIconMessage }
          ]
        }
      ]
    }
  },
  {
    // Genuine CJS Node tooling files (Metro config, Expo config plugins, Jest setup) run directly
    // under Node, outside any bundler/transpiler, so `require()` is the only option. Every Expo app
    // has these, so the exemption belongs here rather than being copy-pasted into each app config.
    files: ['**/metro.config.js', '**/plugins/**/*.js', '**/jest-setup/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  eslintConfigPrettier
];
