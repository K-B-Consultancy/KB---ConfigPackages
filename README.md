# KB---ConfigPackages

Public monorepo that publishes KB Consultancy shared configuration packages to GitHub Packages.

## Packages

- `@k-b-consultancy/eslint-config`
- `@k-b-consultancy/prettier-config`
- `@k-b-consultancy/tsconfig`
- `@k-b-consultancy/stylelint-config`

## Install in client project

```json
{
  "devDependencies": {
    "@k-b-consultancy/eslint-config": "1.0.0",
    "@k-b-consultancy/prettier-config": "1.0.0",
    "@k-b-consultancy/tsconfig": "1.0.0"
  }
}
```

### ESLint

```js
import kbBase from "@k-b-consultancy/eslint-config";

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

## Release and publishing

Create a GitHub release (or use workflow dispatch) to publish all packages to GitHub Packages.

## Migration from KB-Documentation

- Replace copied `.ai-docs/config/*` files with exact-pinned `@k-b-consultancy/*` dependencies.
- Keep KB-Documentation as docs-only for config guidance.
