import test from 'node:test';
import assert from 'node:assert/strict';

import { bump } from '../scripts/bump-version.mjs';

test('bump patch increments the last segment', () => {
  assert.equal(bump('1.2.6', 'patch'), '1.2.7');
});

test('bump minor increments minor and resets patch', () => {
  assert.equal(bump('1.2.6', 'minor'), '1.3.0');
});

test('bump major increments major and resets minor/patch', () => {
  assert.equal(bump('1.2.6', 'major'), '2.0.0');
});

test('bump rejects an unknown type', () => {
  assert.throws(() => bump('1.2.6', 'bogus'));
});
