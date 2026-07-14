# @k-b-consultancy/tsconfig

Org-wide strict TypeScript flag set — the executable form of `react-base/RULES.md` § TypeScript.

## Install

Published on the public npm registry — no registry setup or auth needed. Exact-pinned:

```sh
pnpm add -D @k-b-consultancy/tsconfig typescript
```

## Use

```jsonc
// tsconfig.json
{
  "extends": "@k-b-consultancy/tsconfig/base.json",
  "compilerOptions": {
    // App-owned: target, module, jsx — and the path alias:
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"]
}
```

## Next.js

```jsonc
// tsconfig.json
{
  "extends": "@k-b-consultancy/tsconfig/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

Matches the `tsconfig.json` Next.js itself generates on `next dev`/`next build`: `jsx: "react-jsx"`,
`module: "esnext"`, the DOM `lib`, and the `next` TS plugin (which powers typed routes and other
editor integration). `next dev`/`next build` may still rewrite fields it manages directly —that's
expected, not a sign this flavor is wrong.

## TanStack Start

```jsonc
// tsconfig.json
{
  "extends": "@k-b-consultancy/tsconfig/tanstack-start.json",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Matches TanStack Start's own documented `tsconfig.json` recommendation: `target: "es2022"`,
`module: "esnext"`, `jsx: "react-jsx"`. Path aliases aren't wired by the framework by default — add
`baseUrl`/`paths` yourself if you want them (see TanStack's path-aliases guide).

## React Native

```jsonc
// tsconfig.json
{
  "extends": "@k-b-consultancy/tsconfig/react-native.json",
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Sets `target`/`module`/`lib`/`jsx` for the Hermes+Metro runtime (base leaves these app-owned since
they vary per platform) and `forceConsistentCasingInFileNames: false` — Metro's package.json
`exports` resolution breaks under that flag, and `@react-native/typescript-config` disables it for
the same reason.

## What `base.json` deliberately does NOT set

- **`baseUrl`** — a hard error under TypeScript 6 (TS5101); never re-add it.
- **`paths`** — relative paths declared in an extended config resolve inside `node_modules`, so
  aliases must live in the consuming app.
- **`target` / `module` / `jsx` / `lib`** — varies per stack, so `base.json` leaves them app-owned.
  The `nextjs.json` / `tanstack-start.json` / `react-native.json` flavors set them because those
  values are constant across every app on that stack — use a flavor instead of restating these
  yourself.

## Adopting in a legacy codebase

Extend the base and explicitly override the strictness flags the codebase can't satisfy yet
(`"strict": false`, `"noUnusedLocals": false`, …) with a comment; remove the overrides as the code
is tightened.
