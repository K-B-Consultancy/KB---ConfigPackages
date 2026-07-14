import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { URL } from 'node:url';

import eslintConfig from '../packages/eslint-config/src/index.js';
import eslintConfigNextjs from '../packages/eslint-config/src/nextjs.js';
import eslintConfigTanstackStart from '../packages/eslint-config/src/tanstack-start.js';
import eslintConfigReactNative from '../packages/eslint-config/src/react-native.js';
import prettierConfig from '../packages/prettier-config/index.js';
import stylelintConfig from '../packages/stylelint-config/index.js';

const tsconfigPath = new URL('../packages/tsconfig/base.json', import.meta.url);
const tsconfigReactNativePath = new URL('../packages/tsconfig/react-native.json', import.meta.url);
const tsconfigNextjsPath = new URL('../packages/tsconfig/nextjs.json', import.meta.url);
const tsconfigTanstackStartPath = new URL(
  '../packages/tsconfig/tanstack-start.json',
  import.meta.url
);

test('eslint config exports an array', () => {
  assert.ok(Array.isArray(eslintConfig));
  assert.ok(eslintConfig.length > 0);
});

test('eslint config ships global ignores for generated output', () => {
  const ignoreBlock = eslintConfig.find(entry => entry.ignores && Object.keys(entry).length === 1);
  assert.ok(ignoreBlock, 'expected a global ignores entry');
  assert.ok(ignoreBlock.ignores.includes('**/dist/'));
});

test('eslint config leaves module resolution to tsc', () => {
  const ruleBlock = eslintConfig.find(entry => entry.rules?.['import-x/no-unresolved']);
  assert.equal(ruleBlock.rules['import-x/no-unresolved'], 'off');
  assert.equal(ruleBlock.rules['import-x/named'], 'off');
});

test('eslint config carries the full org rule set from react-base RULES.md', () => {
  const allRules = Object.assign({}, ...eslintConfig.map(entry => entry.rules ?? {}));
  for (const rule of [
    'import-x/order',
    'no-restricted-exports',
    'no-restricted-imports',
    'max-lines',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/consistent-type-imports',
    'local/no-direct-query-in-components'
  ]) {
    assert.ok(rule in allRules, `expected rule ${rule} in shared config`);
  }

  // Base is Vite/plain React — fully client-side, and Datadog RUM forwards browser
  // console output, so no-console doesn't apply here.
  assert.ok(!('no-console' in allRules), 'base flavor must not enable no-console');
});

test('tanstack-start flavor extends the base config', () => {
  assert.ok(Array.isArray(eslintConfigTanstackStart));
  assert.ok(
    eslintConfigTanstackStart.length > eslintConfig.length,
    'flavor adds entries on top of base'
  );

  const refreshBlock = eslintConfigTanstackStart.find(
    entry => entry.rules?.['react-refresh/only-export-components']
  );
  assert.ok(refreshBlock, 'tanstack-start flavor wires react-refresh');

  const allRules = Object.assign({}, ...eslintConfigTanstackStart.map(entry => entry.rules ?? {}));
  assert.equal(
    allRules['local/no-console-in-server-functions'],
    'error',
    'tanstack-start flavor enables the createServerFn-aware console rule'
  );
  assert.ok(
    !('no-console' in allRules),
    'tanstack-start flavor must not enable plain no-console (it would also flag client code)'
  );
});

test('nextjs flavor stands alone (does not spread base)', () => {
  // eslint-config-next registers its own typescript-eslint, jsx-a11y, and
  // react-hooks under the same plugin keys base uses. If nextjs.js spread base,
  // ESLint 9 flat config would reject the app's config with "Cannot redefine
  // plugin" once eslint-config-next is appended alongside it.
  assert.ok(Array.isArray(eslintConfigNextjs));

  const registeredPlugins = new Set(
    eslintConfigNextjs.flatMap(entry => Object.keys(entry.plugins ?? {}))
  );
  for (const collidingPlugin of ['@typescript-eslint', 'jsx-a11y', 'react-hooks']) {
    assert.ok(
      !registeredPlugins.has(collidingPlugin),
      `nextjs flavor must not register ${collidingPlugin} — eslint-config-next already does`
    );
  }

  const allRules = Object.assign({}, ...eslintConfigNextjs.map(entry => entry.rules ?? {}));
  for (const rule of [
    'import-x/order',
    'no-restricted-exports',
    'no-restricted-imports',
    'max-lines',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/consistent-type-imports',
    'local/no-direct-query-in-components',
    'local/no-console-in-server-components'
  ]) {
    assert.ok(rule in allRules, `expected rule ${rule} in nextjs flavor`);
  }

  // Plain no-console would also flag console calls in Client Components, which Datadog
  // RUM does capture — only the directive-aware local rule should be enabled.
  assert.ok(!('no-console' in allRules), 'nextjs flavor must not enable plain no-console');

  const nextFrameworkBlock = eslintConfigNextjs.find(
    entry => entry.files && entry.rules?.['no-restricted-exports'] === 'off'
  );
  assert.ok(nextFrameworkBlock, 'nextjs flavor re-enables default exports for framework files');
});

test('react-native flavor stands alone (does not spread base)', () => {
  // jsx-a11y targets DOM elements (img, a, label...) that don't exist in React
  // Native, and jsx-a11y/no-autofocus would false-positive on RN's own TextInput
  // autoFocus prop — so this flavor must not register jsx-a11y.
  assert.ok(Array.isArray(eslintConfigReactNative));

  const registeredPlugins = new Set(
    eslintConfigReactNative.flatMap(entry => Object.keys(entry.plugins ?? {}))
  );
  assert.ok(!registeredPlugins.has('jsx-a11y'), 'react-native flavor must not register jsx-a11y');
  assert.ok(
    registeredPlugins.has('react-native'),
    'react-native flavor wires eslint-plugin-react-native'
  );
  assert.ok(
    registeredPlugins.has('@react-native'),
    'react-native flavor wires @react-native/eslint-plugin'
  );

  const allRules = Object.assign({}, ...eslintConfigReactNative.map(entry => entry.rules ?? {}));
  for (const rule of [
    'import-x/order',
    'no-restricted-exports',
    'no-restricted-imports',
    'max-lines',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/consistent-type-imports',
    'local/no-direct-query-in-components',
    'react-native/no-raw-text',
    '@react-native/no-deep-imports',
    '@react-native/platform-colors'
  ]) {
    assert.ok(rule in allRules, `expected rule ${rule} in react-native flavor`);
  }

  // RN has no server-component concept — Datadog RUM's mobile SDK captures console
  // output directly, so no-console doesn't apply here either.
  assert.ok(!('no-console' in allRules), 'react-native flavor must not enable no-console');

  // eslint-plugin-react-native's other rules call context methods ESLint 10 removed
  // and crash outright — only no-raw-text is safe to enable today.
  for (const rule of [
    'react-native/no-unused-styles',
    'react-native/split-platform-components',
    'react-native/no-single-element-style-arrays'
  ]) {
    assert.ok(!(rule in allRules), `${rule} is broken on ESLint 10 and must stay disabled`);
  }

  const ignoreBlock = eslintConfigReactNative.find(
    entry => entry.ignores && Object.keys(entry).length === 1
  );
  assert.ok(ignoreBlock.ignores.includes('**/android/'));
  assert.ok(ignoreBlock.ignores.includes('**/ios/'));
});

test('prettier config matches expected core options', () => {
  assert.equal(prettierConfig.printWidth, 100);
  assert.equal(prettierConfig.singleQuote, true);
  assert.equal(prettierConfig.arrowParens, 'avoid');
});

test('stylelint placeholder config shape', () => {
  assert.deepEqual(stylelintConfig, {
    extends: [],
    rules: {}
  });
});

test('tsconfig base is valid strict config json', async () => {
  const raw = await fs.readFile(tsconfigPath, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(parsed.compilerOptions.strict, true);
  assert.equal(parsed.compilerOptions.noImplicitAny, true);
});

test('tsconfig base carries no path-dependent options', async () => {
  const raw = await fs.readFile(tsconfigPath, 'utf8');
  const parsed = JSON.parse(raw);

  // baseUrl is a hard error under TypeScript 6, and relative paths in an extended
  // config resolve inside node_modules — both must live in the consuming app instead
  assert.equal(parsed.compilerOptions.baseUrl, undefined);
  assert.equal(parsed.compilerOptions.paths, undefined);
});

test('tsconfig react-native flavor extends base and sets the RN runtime flags', async () => {
  const raw = await fs.readFile(tsconfigReactNativePath, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(parsed.extends, './base.json');
  assert.equal(parsed.compilerOptions.jsx, 'react-native');
  assert.equal(parsed.compilerOptions.noEmit, true);
  // Metro's package.json "exports" resolution breaks under this flag —
  // @react-native/typescript-config disables it for the same reason.
  assert.equal(parsed.compilerOptions.forceConsistentCasingInFileNames, false);
});

test('tsconfig nextjs flavor extends base and matches the Next.js-generated config', async () => {
  const raw = await fs.readFile(tsconfigNextjsPath, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(parsed.extends, './base.json');
  assert.equal(parsed.compilerOptions.jsx, 'react-jsx');
  assert.equal(parsed.compilerOptions.module, 'esnext');
  assert.equal(parsed.compilerOptions.noEmit, true);
  assert.deepEqual(parsed.compilerOptions.plugins, [{ name: 'next' }]);
});

test('tsconfig tanstack-start flavor extends base and matches the documented recommendation', async () => {
  const raw = await fs.readFile(tsconfigTanstackStartPath, 'utf8');
  const parsed = JSON.parse(raw);

  assert.equal(parsed.extends, './base.json');
  assert.equal(parsed.compilerOptions.jsx, 'react-jsx');
  assert.equal(parsed.compilerOptions.module, 'esnext');
  assert.equal(parsed.compilerOptions.target, 'es2022');
});
