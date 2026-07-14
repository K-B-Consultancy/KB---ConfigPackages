# @k-b-consultancy/prettier-config

Org-wide Prettier configuration. Clients re-export it and never hand-write formatting options.

## Install

Published on the public npm registry — no registry setup or auth needed. Exact-pinned:

```sh
pnpm add -D @k-b-consultancy/prettier-config prettier
```

## Use

```js
// prettier.config.js
export {default} from '@k-b-consultancy/prettier-config';
```

Delete any `.prettierrc*` files — one config source only.

Add a `.prettierignore` for generated paths (ESLint ignores ship in
`@k-b-consultancy/eslint-config`; Prettier's don't), e.g.:

```
dist
src/types/api.ts
```

## Notes

- Editors format on save (`.vscode/settings.json` ships via the project template); CI runs
  `prettier --check`.
- Adopting this in an existing codebase is a one-time whole-repo reformat — land it as its own
  commit so `git blame` stays useful.
