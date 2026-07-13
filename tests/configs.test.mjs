import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { URL } from "node:url";

import eslintConfig from "../packages/eslint-config/src/index.js";
import prettierConfig from "../packages/prettier-config/index.js";
import stylelintConfig from "../packages/stylelint-config/index.js";

const tsconfigPath = new URL("../packages/tsconfig/base.json", import.meta.url);

test("eslint config exports an array", () => {
  assert.ok(Array.isArray(eslintConfig));
  assert.ok(eslintConfig.length > 0);
});

test("prettier config matches expected core options", () => {
  assert.equal(prettierConfig.printWidth, 100);
  assert.equal(prettierConfig.singleQuote, false);
  assert.equal(prettierConfig.arrowParens, "always");
});

test("stylelint placeholder config shape", () => {
  assert.deepEqual(stylelintConfig, {
    extends: [],
    rules: {}
  });
});

test("tsconfig base is valid strict config json", async () => {
  const raw = await fs.readFile(tsconfigPath, "utf8");
  const parsed = JSON.parse(raw);

  assert.equal(parsed.compilerOptions.strict, true);
  assert.equal(parsed.compilerOptions.noImplicitAny, true);
});
