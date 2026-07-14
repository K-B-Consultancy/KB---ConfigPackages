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

## What the base deliberately does NOT set

- **`baseUrl`** — a hard error under TypeScript 6 (TS5101); never re-add it.
- **`paths`** — relative paths declared in an extended config resolve inside `node_modules`, so
  aliases must live in the consuming app.
- **`target` / `module` / `jsx` / `lib`** — runtime-specific; each app declares its own.

## Adopting in a legacy codebase

Extend the base and explicitly override the strictness flags the codebase can't satisfy yet
(`"strict": false`, `"noUnusedLocals": false`, …) with a comment; remove the overrides as the code
is tightened.
