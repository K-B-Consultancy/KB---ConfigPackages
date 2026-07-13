# Commit and PR Conventions

We use **Conventional Commits**. This makes changelog generation deterministic and helps AI agents understand intent from history.

## Commit format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New functional requirement implemented |
| `fix` | Bug fix |
| `chore` | Tooling, deps, refactors with no behavior change |
| `docs` | Documentation only |
| `test` | Tests only (when adding tests retroactively) |
| `ci` | CI/CD configuration changes |

### Scope

In a monorepo, scope is the **app name** (matches the `apps/<name>` directory):

- `feat(api): add company subscription endpoint`
- `fix(web-admin): correct date formatting in interest list`
- `chore(repo): bump shared lint config`

Use `repo` for changes affecting the root (CI, top-level configs, `.ai-docs/` sync). Use `docs` as scope when the change is in `docs/` and not tied to a specific app.

### Description

- **Imperative mood**: "add", "fix", "remove" — not "added", "fixes", "removed"
- Lowercase first word
- No trailing period
- ≤ 72 characters

### Body

Use the body to explain **why**, not what. The diff already says what.

```
feat(api): add order cancellation endpoint

Customers need to cancel an order while it is still in DRAFT status.
This endpoint validates the state transition and releases any
reserved stock.

Refs: PROJ-142
```

## PR titles and descriptions

- **Title:** same format as a commit message — `<type>(<scope>): <description>`. When the PR is a single commit, this is just the commit message.
- **Description:** one paragraph of context (why this change) + a bulleted list of what's in it + a "how to verify" section that points to the tests or manual steps.

## Rules

- **One logical change per commit** — not one commit per file, not one commit per session
- **Never commit secrets** — see [`SECRETS.md`](./SECRETS.md)
- **Never commit commented-out code** — delete it; Git remembers
- **Cross-app PRs are allowed and expected** when a feature requires changes in multiple apps; the orchestrator workflow in the root `AGENTS.md` handles this

## For AI agents

- Each commit you make should match exactly one bullet from your task plan. If a single commit is doing two unrelated things, split it.
- If you can't write a one-line description in imperative mood under 72 characters, the change is too big.
