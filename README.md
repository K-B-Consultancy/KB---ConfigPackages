# KB---ConfigPackages

Public monorepo that publishes KB Consultancy shared configuration packages to the public npm
registry.

## Packages

- `@k-b-consultancy/eslint-config`
- `@k-b-consultancy/prettier-config`
- `@k-b-consultancy/tsconfig`
- `@k-b-consultancy/stylelint-config`

Each package has a README with full install/wiring instructions. Packages are public and unscoped by
registry auth — no `.npmrc` or token setup needed to install them. Quick reference:

### ESLint

```js
import kbBase from '@k-b-consultancy/eslint-config';
// or: @k-b-consultancy/eslint-config/nextjs · /tanstack-start · /react-native

export default [...kbBase];
```

### Prettier

```js
export { default } from '@k-b-consultancy/prettier-config';
```

### TypeScript

```json
{
  "extends": "@k-b-consultancy/tsconfig/base.json"
  // or: /nextjs.json · /tanstack-start.json · /react-native.json
}
```

Path aliases (`baseUrl`/`paths`) are app-owned — the shared base deliberately carries none.

## Release and publishing

All packages are versioned in **lockstep** with the root `package.json` — every release bumps every
`version` field (root + all four packages) together. Versioning is label-driven, not manual:

1. Add exactly one of the **`major`**, **`minor`**, or **`patch`** labels to your PR if it touches
   `packages/`. `require-version-label.yml` fails the PR otherwise. Dependabot PRs (labeled
   `dependencies`) are exempt — Release Drafter's `default: patch` covers them, and they're
   published as a monthly batch instead of on every merge (see below).
2. Release Drafter (`release-drafter.yml`) works as it always has: it maintains a draft release and
   resolves the next version from those labels, same as any other release-drafter setup.
3. On every push to `main`, a second job in that same workflow reads Release Drafter's
   `resolved_version` output and writes it into every `package.json`, committing the bump straight
   to `main` (`chore: bump version to v<version> [skip ci]`). You never hand-edit a `version` field,
   and it can't drift from the draft since it's reading the same resolved value the draft uses.
4. Publish the release from the GitHub UI. `publish.yml` verifies the tag matches every
   `package.json` version (it fails the publish otherwise — though step 3 already guarantees a
   match), then publishes all packages to the public npm registry. Already-published versions are
   skipped, so re-runs are safe.

Dependency-only PRs still go through steps 2–3 on every merge, so the draft and `package.json` stay
current all month. `monthly-dependency-release.yml` just checks whether everything merged since the
last release was dependency-only, and if so, publishes the existing draft as-is on the 1st.

## Migration from KB-Documentation

- Replace copied `.ai-docs/config/*` files with exact-pinned `@k-b-consultancy/*` dependencies.
- Keep KB-Documentation as docs-only for config guidance.
