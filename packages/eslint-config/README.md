# @k-b-consultancy/eslint-config

Org-wide ESLint flat config — the executable form of `react-base/RULES.md` § ESLint in
KB-Documentation. Clients extend it and never hand-write the rule set; a rule is added or changed
here, never per project.

## Install

Published on the public npm registry — no registry setup or auth needed. Exact-pinned:

```sh
pnpm add -D @k-b-consultancy/eslint-config \
  eslint typescript-eslint eslint-plugin-react-hooks \
  eslint-plugin-import-x eslint-plugin-jsx-a11y eslint-config-prettier
```

## Use

### React base (Vite, plain React)

```js
// eslint.config.js
import kbBase from '@k-b-consultancy/eslint-config';

export default [
  ...kbBase
  // app-specific overrides last
];
```

### Next.js

```js
// eslint.config.js
import kbNext from '@k-b-consultancy/eslint-config/nextjs';

export default [
  ...kbNext
  // append eslint-config-next (core-web-vitals + typescript) here —
  // its version is coupled to your Next.js version
];
```

### TanStack Start

Also install the optional peer `eslint-plugin-react-refresh`:

```js
// eslint.config.js
import kbTanstackStart from '@k-b-consultancy/eslint-config/tanstack-start';

export default [...kbTanstackStart];
```

## What it enforces (intent, not the full list — read `src/`)

- `local/no-direct-query-in-components` — hooks own all data-fetching
- `no-console` — output belongs in the monitoring logger
- `max-lines` (200 for `.tsx`, 100 for `use[A-Z]*.ts`) — split components, extract hooks
- `no-restricted-exports` (default exports) — named exports everywhere; stack flavors re-enable
  defaults only where the framework requires them
- `no-restricted-imports` on `@/features/*/*` — cross-feature imports go through the feature's
  public API
- `import-x/order` — one alphabetized import block, no group separation (auto-fixable)
- `jsx-a11y` strict — accessibility is mechanical, not aspirational
- `import-x/no-unresolved` / `import-x/named` are **off**: tsc owns module resolution (typecheck is
  a required CI gate)

## Adopting in a legacy codebase

Keep the base intact and append app-level _warn_ downgrades with a `//TODO: Switch back to error`
note, scoped as narrowly as possible. Never fork the rule set.
