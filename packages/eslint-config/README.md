# @k-b-consultancy/eslint-config

Org-wide ESLint flat config — the executable form of `react-base/RULES.md` § ESLint in
KB-Documentation. Clients extend it and never hand-write the rule set; a rule is added or changed
here, never per project.

## Install

Published on the public npm registry — no registry setup or auth needed. The plugins it needs
(`typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-import-x`,
`eslint-plugin-jsx-a11y`, `eslint-config-prettier`, `eslint-plugin-react-refresh`) ship as direct
dependencies of this package, so you don't need to list them yourself. Only `eslint` itself is a
peer — install that alongside:

```sh
pnpm add -D @k-b-consultancy/eslint-config eslint
```

You can still add any of the bundled plugins to your own `devDependencies` if you need to pin a
different version — your app's copy wins the same way any other npm dependency resolution does.

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

`local/no-console-in-server-components` replaces plain `no-console` here: it reads each file's
`'use client'` directive and only flags `console.*` in files without one (Server Components, Route
Handlers, Server Actions — the App Router default). Datadog RUM only forwards console output from
the browser, so a Client Component's `console.log` reaches monitoring but a Server Component's
doesn't — use your server logger there instead.

### TanStack Start

`eslint-plugin-react-refresh` ships bundled — nothing extra to install:

```js
// eslint.config.js
import kbTanstackStart from '@k-b-consultancy/eslint-config/tanstack-start';

export default [...kbTanstackStart];
```

TanStack Start has no client/server file directive, so `local/no-console-in-server-functions`
instead flags `console.*` calls written inside a `createServerFn()`/`createServerOnlyFn()`
`.handler(...)` callback — those run on the server only and Datadog RUM can't see them. Console
calls anywhere else (components, client-side loaders) are unrestricted.

### React Native

`@react-native/eslint-plugin` and `eslint-plugin-react-native` ship bundled — nothing extra to
install:

```js
// eslint.config.js
import kbReactNative from '@k-b-consultancy/eslint-config/react-native';

export default [...kbReactNative];
```

This flavor stands alone rather than spreading the base config: `jsx-a11y` targets DOM elements
(`img`, `a`, `label`...) that don't exist in React Native, and some of its rules key off prop names
alone — `jsx-a11y/no-autofocus` would false-positive on RN's own `TextInput` `autoFocus` prop. RN
accessibility (`accessibilityLabel`, `accessibilityRole`, ...) isn't mechanically linted yet; review
it by hand until an org rule lands.

Only `no-raw-text` is enabled from `eslint-plugin-react-native` — its other rules
(`no-unused-styles`, `split-platform-components`, `no-single-element-style-arrays`) call context
methods ESLint 10 removed and crash outright. Re-add them once upstream ships an
ESLint-10-compatible release.

`react-native/no-raw-text` requires all text live inside `<Text>`. If you wrap `<Text>` in a
design-system component (e.g. `<AppText>`), allow it with an app-level override:

```js
export default [
  ...kbReactNative,
  { rules: { 'react-native/no-raw-text': ['error', { skip: ['AppText'] }] } }
];
```

## What it enforces (intent, not the full list — read `src/`)

- `local/no-direct-query-in-components` — hooks own all data-fetching
- `max-lines` (300 for `.tsx`, 200 for `use[A-Z]*.ts`) — split components, extract hooks
- `console.*` — allowed everywhere Datadog RUM can see it (base, React Native, and Client
  Components); the Next.js and TanStack Start flavors still forbid it on the server, where RUM's
  console forwarding doesn't reach
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
