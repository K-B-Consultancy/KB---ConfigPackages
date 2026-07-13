# GitHub Actions — Stack Rules

## Action version pinning

**Pin every action to an exact version**, not a major-version tag. This is part of the org-wide rule in [`DEPENDENCIES.md`](../../00-org-wide/DEPENDENCIES.md).

```yaml
# ✅
uses: actions/checkout@v6.0.0
uses: actions/setup-node@v6.4.0
uses: actions/setup-java@v5.0.0

# ❌
uses: actions/checkout@v6
uses: actions/setup-node@latest
uses: actions/setup-node@main
```

- Update versions via **Dependabot**, not manually (see [`DEPENDENCIES.md`](../../00-org-wide/DEPENDENCIES.md))
- **Trusted publishers only**: `actions/*`, `docker/*`, vendor-official (e.g., `slackapi/`, `release-drafter/`, `microsoft/playwright-github-action`)
- Never use a random third-party action without reviewing its source. Marketplace actions can exfiltrate secrets.

How to find the latest version when adding a new action:

```bash
gh release list --repo actions/checkout --limit 1
```

## Mandatory workflows in every monorepo

Every client monorepo ships with these workflows from day one. Templates live under [`20-templates/.github/`](../../20-templates/.github/) and are installed by [`init-client-monorepo.sh`](../../scripts/init-client-monorepo.sh).

| Workflow                   | Purpose                                                                                    | Template                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `pr-checks.yml`            | Format, lint, typecheck, unit, E2E, build — gated by paths-filter so only changed apps run | [pr-checks.yml](../../20-templates/.github/workflows/pr-checks.yml)                       |
| `copilot-setup-steps.yml`  | Prepares the toolchain (JDK, Node) for Copilot agent sessions                              | [copilot-setup-steps.yml](../../20-templates/.github/workflows/copilot-setup-steps.yml)   |
| `dependabot-automerge.yml` | Auto-merges patch + minor dep updates (with exclusion lists)                               | [dependabot-automerge.yml](../../20-templates/.github/workflows/dependabot-automerge.yml) |
| `release-drafter.yml`      | Auto-builds release notes from merged PR labels                                            | [release-drafter.yml](../../20-templates/.github/workflows/release-drafter.yml)           |

And these config files at `.github/` root:

| File                  | Purpose                                                | Template                                                              |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `dependabot.yml`      | Schedules Dependabot updates (staggered per ecosystem) | [dependabot.yml](../../20-templates/.github/dependabot.yml)           |
| `release-drafter.yml` | Maps PR labels to release-note sections                | [release-drafter.yml](../../20-templates/.github/release-drafter.yml) |

### `copilot-setup-steps.yml` specifics

Without this workflow, Copilot's agent sessions run in a barebones container and fail on anything requiring the right Java version, Node version, or dependency installation — especially Spring Boot apps where the wrong JDK means nothing compiles. The job name **must** be exactly `copilot-setup-steps` — that's the name Copilot looks for.

## The cache rule (mandatory)

**Always cache dependency installation.** No exceptions.

A `setup-*` action without `cache:` set is a bug. Skipping the cache adds 30–90 seconds per job.

| Ecosystem           | Cache method                                                       |
| ------------------- | ------------------------------------------------------------------ |
| Node (npm)          | `actions/setup-node` with `cache: 'npm'`                           |
| Node (pnpm)         | `pnpm/action-setup` then `actions/setup-node` with `cache: 'pnpm'` |
| Java (Maven)        | `actions/setup-java` with `cache: 'maven'`                         |
| Playwright browsers | `actions/cache` keyed on the lockfile hash                         |

See the templates for concrete examples.

## Concurrency

Every workflow has a concurrency group. Always include `github.repository` in the group key so that concurrency groups are unique across repositories — otherwise two separate client repos could share a group key and cancel each other's runs.

**PR workflows** (triggered by `pull_request` events) — scope by PR number:

```yaml
concurrency:
  group: ${{ github.repository }}-<workflow-name>-${{ github.event.pull_request.number }}
  cancel-in-progress: true
```

**Branch workflows** (triggered by `push`, `release`, etc.) — scope by ref:

```yaml
concurrency:
  group: ${{ github.repository }}-<workflow-name>-${{ github.ref }}
  cancel-in-progress: true
```

### Cancel when a PR is merged

Add `closed` to the PR event types and guard the first job with `github.event.action != 'closed'`. On merge, the `closed` event starts a run in the same concurrency group, cancelling still-running jobs from the previous push; the new run itself exits immediately via the `if` guard.

```yaml
on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened
      - ready_for_review
      - closed          # ← triggers cancellation of in-progress runs on merge

jobs:
  your-first-job:
    if: github.event.action != 'closed'   # ← skip actual work for the cancel run
    ...
```

Exception: production-deploy workflows never cancel — use a separate group without `cancel-in-progress`:

```yaml
concurrency:
  group: ${{ github.repository }}-deploy-production
  cancel-in-progress: false
```

## Permissions

Least-privilege GITHUB_TOKEN permissions at the workflow level:

```yaml
permissions:
  contents: read
```

Specific permissions per job when needed. Default permissions are too broad.

## Path filtering — only run what changed

For monorepos, use `dorny/paths-filter` (already in the `pr-checks.yml` template) so a docs-only PR doesn't run the full test suite. The `detect-changes` job outputs per-app flags; subsequent jobs gate on those flags.

Path filtering trims *unaffected* apps only — every affected app still runs the full suite [`TESTING.md`](../../00-org-wide/TESTING.md) mandates. Never use a paths filter to skip a changed app's tests.

## Release Drafter — auto-built release notes

Every monorepo uses **[Release Drafter](https://github.com/release-drafter/release-drafter)** to maintain a running draft of the next release based on merged PRs. The lead engineer reviews and publishes the draft when it's time to ship.

### How it works

The categories, label-to-bucket mapping, and version-bump resolution live in the shipped [`release-drafter.yml`](../../20-templates/.github/release-drafter.yml) config — read it there. The flow: the workflow updates the draft release on every push to `main`; when it's time to release, the lead engineer reviews the draft and publishes; publishing creates the Git tag that triggers the production deploy (Coolify pins to it).

### PR labels — the contract

Every PR must carry exactly one **category label** before merge:

| Label                               | Meaning                                  |
| ----------------------------------- | ---------------------------------------- |
| `feature` / `enhancement` / `minor` | New functionality                        |
| `fix` / `bugfix` / `bug` / `patch`  | Bug fix                                  |
| `dependencies`                      | Dependabot update (set automatically)    |
| `chore` / `ci` / `docs`             | Maintenance, internal changes, docs only |

And optionally one **version-bump label** if the default (patch) is wrong:

| Label   | Effect                                                   |
| ------- | -------------------------------------------------------- |
| `major` | Forces a major version bump (breaking change)            |
| `minor` | Forces a minor version bump (new feature)                |
| `patch` | Forces a patch bump (default if no version label is set) |

If a PR is missing a category label, it doesn't appear in the release notes. Reviewers add the label before merge.

### Why we always do releases

Releases aren't optional: they are the deploy trigger (production deploys run only on `release: published`), the changelog, and the rollback point (each release is a Git tag Coolify can pin to). Even tiny PRs ship via a release — one bullet in the notes is fine.

## Standard CI workflow

See [`pr-checks.yml`](../../20-templates/.github/workflows/pr-checks.yml) for the template.

The jobs:

1. **detect-changes** — paths-filter to determine which apps changed
2. Per-app jobs (in parallel) — format, lint, typecheck, unit, E2E (frontend), `mvn verify` (backend), build

Jobs run in parallel where independent. Each per-app job is gated on `needs.detect-changes.outputs.<app-name> == 'true'`.

## Deployment workflows

Two environments per client, both backed by Coolify:

### Staging (main branch + PR previews)

- Triggered by **push to `main`** → Coolify auto-pulls the latest `main` for staging
- Coolify's **per-PR preview deployments** are enabled where supported
- The GitHub Action does not push to Coolify directly — Coolify watches the repo and pulls

### Production (GitHub Releases)

- Triggered by **`release: published`** (when the lead engineer publishes a Release Drafter draft)
- Workflow calls the Coolify production deploy hook
- Coolify pulls the tagged version

Workflow shape:

```yaml
on:
  release:
    types: [published]

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production # gated by required reviewer
    concurrency:
      group: ${{ github.repository }}-deploy-production
      cancel-in-progress: false
    steps:
      - name: Notify Coolify to fetch the release
        run: curl -X POST "$COOLIFY_DEPLOY_HOOK_URL"
        env:
          COOLIFY_DEPLOY_HOOK_URL: ${{ secrets.COOLIFY_DEPLOY_HOOK_URL_PRODUCTION }}
```

## Secrets

- Reference via `${{ secrets.NAME }}` — never echo them to logs
- Store secrets in **GitHub Environments** (Staging, Production) when they differ per deploy target
- Avoid `pull_request_target` unless you understand the security implications

## Workflow file naming

- `kebab-case.yml`
- Named after **what they do**, not when they run: `pr-checks.yml`, `release-drafter.yml`, `dependabot-automerge.yml`
- One workflow per concern. Don't bundle CI + deploy in one file.


## For AI agents

- When adding a new workflow, copy from `.ai-docs/20-templates/.github/workflows/` — don't write from scratch
- Always verify the cache key includes the lockfile path that changes when deps change
- When adding a deploy step, ask which environment and whether it should require manual approval
- When pinning an action version, fetch the latest exact tag via `gh release list --repo <owner>/<repo> --limit 1`
- When opening any PR, ensure it has the right category label so Release Drafter picks it up
- When opening a PR that changes the backend API (new/modified/removed endpoint, DTO change, version bump), include the **API Changes** section from `.github/pull_request_template.md` in the PR description so the developer knows to run the type-generator
- Never commit a `${{ secrets.NAME }}` value resolved to its real value
