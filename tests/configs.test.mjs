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

test("eslint config ships global ignores for generated output", () => {
  const ignoreBlock = eslintConfig.find(
    (entry) => entry.ignores && Object.keys(entry).length === 1
  );
  assert.ok(ignoreBlock, "expected a global ignores entry");
  assert.ok(ignoreBlock.ignores.includes("**/dist/"));
});

test("eslint config leaves module resolution to tsc", () => {
  const ruleBlock = eslintConfig.find((entry) => entry.rules?.["import/no-unresolved"]);
  assert.equal(ruleBlock.rules["import/no-unresolved"], "off");
  assert.equal(ruleBlock.rules["import/named"], "off");
});

test("prettier config matches expected core options", () => {
  assert.equal(prettierConfig.printWidth, 100);
  assert.equal(prettierConfig.singleQuote, true);
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

test("tsconfig base carries no path-dependent options", async () => {
  const raw = await fs.readFile(tsconfigPath, "utf8");
  const parsed = JSON.parse(raw);

  // baseUrl is a hard error under TypeScript 6, and relative paths in an extended
  // config resolve inside node_modules — both must live in the consuming app instead
  assert.equal(parsed.compilerOptions.baseUrl, undefined);
  assert.equal(parsed.compilerOptions.paths, undefined);
});
