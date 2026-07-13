# KB---ConfigPackages

Public monorepo that publishes KB Consultancy shared configuration packages to GitHub Packages.

## Packages

- `@kb-consultancy/eslint-config`
- `@kb-consultancy/prettier-config`
- `@kb-consultancy/tsconfig`
- `@kb-consultancy/stylelint-config`

## Install in client project

```json
{
  "devDependencies": {
    "@kb-consultancy/eslint-config": "1.0.0",
    "@kb-consultancy/prettier-config": "1.0.0",
    "@kb-consultancy/tsconfig": "1.0.0"
  }
}
```

### ESLint

```js
import kbBase from "@kb-consultancy/eslint-config";

export default [...kbBase];
```

### Prettier

```js
export { default } from "@kb-consultancy/prettier-config";
```

### TypeScript

```json
{
  "extends": "@kb-consultancy/tsconfig/base.json"
}
```

## Release and publishing

Create a GitHub release (or use workflow dispatch) to publish all packages to GitHub Packages.

## Migration from KB-Documentation

- Replace copied `.ai-docs/config/*` files with exact-pinned `@kb-consultancy/*` dependencies.
- Keep KB-Documentation as docs-only for config guidance.
