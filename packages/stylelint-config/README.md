# @k-b-consultancy/stylelint-config

Org-wide Stylelint configuration for CSS outside Tailwind. Currently a placeholder rule set — it exists so clients wire the dependency once and rules can land centrally later without per-project changes.

## Install

Registry setup first (see `DEPENDENCIES.md` § GitHub Packages in your repo's `.ai-docs/`). Then, exact-pinned:

```sh
pnpm add -D @k-b-consultancy/stylelint-config stylelint
```

## Use

```js
// stylelint.config.mjs
export { default } from "@k-b-consultancy/stylelint-config";
```

Tailwind-only projects (the org default) usually don't need Stylelint at all — add it when a project accumulates hand-written CSS.
