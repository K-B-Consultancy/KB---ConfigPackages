# KB---ConfigPackages

Public monorepo that publishes KB Consultancy shared configuration packages to GitHub Packages.

## Packages

- `@k-b-consultancy/eslint-config`
- `@k-b-consultancy/prettier-config`
- `@k-b-consultancy/tsconfig`
- `@k-b-consultancy/stylelint-config`

Each package has a README with full install/wiring instructions, including the GitHub Packages registry setup. Quick reference:

### ESLint

```js
import kbBase from "@k-b-consultancy/eslint-config";
// or: @k-b-consultancy/eslint-config/nextjs · @k-b-consultancy/eslint-config/tanstack-start

export default [...kbBase];
```

### Prettier

```js
export { default } from "@k-b-consultancy/prettier-config";
```

### TypeScript

```json
{
  "extends": "@k-b-consultancy/tsconfig/base.json"
}
```

Path aliases (`baseUrl`/`paths`) are app-owned — the shared base deliberately carries none.

## Release and publishing

All packages are versioned in **lockstep** with the root `package.json` — a change to any package bumps every `version` field (root + all four packages) in the same PR.

1. Bump the versions in your PR and merge to `main`.
2. Release Drafter maintains a draft release named `v<version>` taken from the root `package.json`.
3. Publish the release. `publish.yml` verifies the tag matches every `package.json` version (it fails the publish otherwise), then publishes all packages to GitHub Packages. Already-published versions are skipped, so re-runs are safe.

## Migration from KB-Documentation

- Replace copied `.ai-docs/config/*` files with exact-pinned `@k-b-consultancy/*` dependencies.
- Keep KB-Documentation as docs-only for config guidance.
