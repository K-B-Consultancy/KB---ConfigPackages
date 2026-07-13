# Naming Conventions (org-wide)

This file covers only conventions that apply **across every stack and every project**. Code-level naming (database tables, TypeScript types, Java classes, API endpoints, etc.) belongs in the stack rules under `.ai-docs/10-stacks/<stack>/RULES.md`.

## Git branches

- `feature/<short-kebab-description>` — new functionality
- `fix/<short-kebab-description>` — bug fixes
- `chore/<short-kebab-description>` — tooling, deps, refactors with no behavior change
- `docs/<short-kebab-description>` — documentation changes only

## PR titles

PR titles follow the conventional-commit format described in [`COMMITS.md`](./COMMITS.md).

## Repository file naming

Conventions for files that exist outside any particular stack's source tree:

| File type | Convention | Example |
|---|---|---|
| Markdown docs | `SCREAMING_SNAKE_CASE.md` for content docs; `README.md`, `AGENTS.md`, `CLAUDE.md` reserved | `DATA_MODEL.md`, `INFRASTRUCTURE.md` |
| PlantUML files | `kebab-case.puml`, matching purpose | `class.puml`, `internship-application-state.puml` |
| Shell scripts | `kebab-case.sh` | `sync-docs.sh`, `new-subproject.sh` |
| Screenshot files | `kebab-case.png` matching the requirement slug | `login-form.png`, `login-form--error-state.png` |
| GitHub workflows | `kebab-case.yml` | `notify-slack.yml`, `release-deploy.yml` |

## Slugs (for screenshots, anchors, and cross-references)

Slugs are `kebab-case`, lowercase, ASCII only, no leading/trailing dashes. They are stable identifiers used to cross-reference between docs, screenshots, and test fixtures.

- Feature slug: matches the section heading in the app's `README.md` lowercased and kebab-cased
- Requirement slug: a short identifier for a specific functional requirement within a feature

Example: feature "User Authentication" with requirement "Login with email and password" → `user-authentication` / `login-with-email-password`.

## Stack-specific naming

For language- and stack-specific conventions, see:

- `.ai-docs/10-stacks/react-base/RULES.md` — TypeScript types, React components, hooks, files
- `.ai-docs/10-stacks/spring-boot/RULES.md` — Java classes, database tables/columns, API endpoint paths, test method names
- `.ai-docs/10-stacks/<other>/RULES.md` — stack-specific extensions

If a convention is needed for a stack that does not yet have a rules file, propose the convention in a PR to KB-Documentation rather than improvising it in the client project.
