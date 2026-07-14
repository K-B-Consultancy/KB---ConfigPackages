import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {URL} from 'node:url';

import eslintConfig from '../packages/eslint-config/src/index.js';
import eslintConfigNextjs from '../packages/eslint-config/src/nextjs.js';
import eslintConfigTanstackStart from '../packages/eslint-config/src/tanstack-start.js';
import prettierConfig from '../packages/prettier-config/index.js';
import stylelintConfig from '../packages/stylelint-config/index.js';

const tsconfigPath = new URL('../packages/tsconfig/base.json', import.meta.url);

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
    'no-console',
    'no-restricted-imports',
    'max-lines',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/consistent-type-imports',
    'local/no-direct-query-in-components'
  ]) {
    assert.ok(rule in allRules, `expected rule ${rule} in shared config`);
  }
});

test('stack flavors extend the base config', () => {
  for (const flavor of [eslintConfigNextjs, eslintConfigTanstackStart]) {
    assert.ok(Array.isArray(flavor));
    assert.ok(flavor.length > eslintConfig.length, 'flavor adds entries on top of base');
  }

  const nextFrameworkBlock = eslintConfigNextjs.find(
    entry => entry.files && entry.rules?.['no-restricted-exports'] === 'off'
  );
  assert.ok(nextFrameworkBlock, 'nextjs flavor re-enables default exports for framework files');

  const refreshBlock = eslintConfigTanstackStart.find(
    entry => entry.rules?.['react-refresh/only-export-components']
  );
  assert.ok(refreshBlock, 'tanstack-start flavor wires react-refresh');
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
