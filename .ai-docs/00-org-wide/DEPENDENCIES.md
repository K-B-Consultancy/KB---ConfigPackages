# Dependency Versioning

This file applies to **every** dependency in **every** stack: npm packages, Maven dependencies, GitHub Actions, Docker base images, system packages — anything our code depends on.

## The rules

1. **Pin every dependency to an exact version.** No range operators.
2. **When adding or updating a dependency, use the latest stable version available at that moment.**
3. **Future updates are PR'd by an automated tool (Dependabot), never `^x.y.z` auto-resolution.**
4. **Enforce supply-chain guardrails in CI** (audit checks, lockfile discipline, approved-package policy, and package age gates).

The reason: reproducibility. If two developers (or a developer and CI) resolve `^4.2.0` differently, debugging the build difference burns hours. Pinning eliminates that class of problem.

## Supply chain guardrails

AI agents tend to over-install dependencies. Working code is not the same as safe code.

Every project must enforce supply-chain controls before merge:

- Block vulnerable dependencies (`npm audit`, `mvn dependency-check`, or stack equivalent)
- Enforce lockfile discipline (lockfile updates only when dependency changes are intentional)
- Allow only approved ecosystems/sources
- Use automated dependency updates (Dependabot) with review gates
- Reject packages that are too new via a package age gate

Package age gate default: **3 days**. If a package was published minutes ago, CI should not trust it yet — a Dependabot PR for `left-pad 2.0.1` published 2 hours ago waits until the gate passes, however green its checks.

## What "exact version" means per ecosystem

| Ecosystem          | Acceptable                          | Not acceptable                                                  |
| ------------------ | ----------------------------------- | --------------------------------------------------------------- |
| npm / pnpm         | `"react": "19.0.0"`                 | `"react": "^19.0.0"`, `"react": "~19.0.0"`, `"react": "latest"` |
| Maven              | `<version>3.5.2</version>`          | `<version>3.5.+</version>`, `LATEST`, `RELEASE`                 |
| GitHub Actions     | `uses: actions/checkout@v6.0.0`     | `@v6`, `@main`, `@latest`                                       |
| Docker base image  | `FROM eclipse-temurin:25.0.1_9-jre` | `FROM eclipse-temurin:25-jre`, `:latest`                        |
| nixpacks providers | exact version in `nixpacks.toml`    | unpinned                                                        |

For Node projects (the React stacks standardize on **pnpm** — see [`react-base/RULES.md`](../10-stacks/react-base/RULES.md)), the committed root `.npmrc` configures exact-version writes on install — the canonical file is [`20-templates/.npmrc`](../20-templates/.npmrc); copy it, don't retype it. It makes `pnpm add <pkg>` write `"pkg": "1.2.3"` instead of `"pkg": "^1.2.3"`.

## Finding the latest version

When an AI agent needs to add or update a dependency and wants the latest stable version, use **the first applicable** of the following — in order:

### 1. Use the package manager's query command (preferred)

| Ecosystem       | Command                                                                                                                                       |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| npm             | `npm view <package> version`                                                                                                                  |
| Maven Central   | `curl -s "https://search.maven.org/solrsearch/select?q=g:<group>+AND+a:<artifact>&rows=1&wt=json" \| jq -r '.response.docs[0].latestVersion'` |
| GitHub Releases | `gh release list --repo <owner>/<repo> --limit 1`                                                                                             |

### 2. Web search for the official release page

If the CLI route isn't available (e.g., Docker image, third-party action without a CLI), web search for `"<package name>" latest release site:github.com` or the project's official site. Take the version from the project's **own release notes**, not from a third-party blog or tutorial.

### 3. Ask the developer

If the version is genuinely ambiguous (multiple supported major lines, a recent beta the org may or may not have adopted), **ask the developer** before picking.

### 4. Document the chosen version

After installing, **note the version and date** in the relevant stack rules file or the app's `README.md`, in the section that mentions the dependency:

```
> Spotless: pinned at 2.50.0 as of 2026-05-25
```

This creates a paper trail: anyone reading the docs can tell whether the documented version is current or stale.

---

## Dependabot — automated update strategy

We use **Dependabot** (not Renovate) for automated dependency updates. The configuration is designed around three goals:

1. **Stagger updates** so a bad Monday doesn't break everything at once
2. **Group related ecosystems** into single PRs to reduce review overhead
3. **Auto-merge safe updates** (minor + patch) so humans only review what matters

### The default `dependabot.yml`

Every client monorepo has a `.github/dependabot.yml`. The canonical template — copied at init and adjusted to the project's real app paths — is [`20-templates/.github/dependabot.yml`](../20-templates/.github/dependabot.yml). Do not restate its contents anywhere; the template is the single source of truth.

Its shape: the backend's Maven + Docker updates are grouped into one Monday PR; each frontend app gets its own weekly npm PR on its own day (with a `shadcn-ui` group bundling the design-system packages); GitHub Actions updates land on Friday.

### Why this shape

| Choice                                       | Reason                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Weekly schedule**                          | Daily creates more noise than humans can review. Monthly leaves security holes open too long.                                                                                 |
| **One PR per app, different days**           | Each app gets an isolated update window. If one app's Wednesday update breaks something, the team has Thursday to notice before the next app is updated.                      |
| **API maven + docker grouped (Monday)**      | A Spring Boot version bump typically requires both a `pom.xml` change and a matching Docker base image update. One PR is easier to review than two.                           |
| **shadcn-ui group per frontend app**         | `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge` all belong to the same design-system layer and should be reviewed together.          |
| **`open-pull-requests-limit: 5` (npm apps)** | Allows one group PR (shadcn-ui) and up to four individual dep PRs to coexist. Keeps the queue manageable without forcing a strictly serial review.                            |
| **Single label `dependencies`**              | Used by Release Drafter to bucket all dep updates under "🧰 Maintenance" in release notes.                                                                                    |

### Auto-merge for minor + patch

Every client repo has a `.github/workflows/dependabot-automerge.yml` that auto-enables merge when:

- The update is **patch** or **minor** (never major)
- The dependency is **not** on the per-project exclusion list (see below)
- The required CI checks (PR checks workflow) have passed

Branch protection on `main` enforces "required checks must pass" — so even if auto-merge is enabled, a failing test blocks the merge. This is the safety net.

Canonical template at [`20-templates/.github/workflows/dependabot-automerge.yml`](../20-templates/.github/workflows/dependabot-automerge.yml).

### Per-project exclusion list

Some packages cannot auto-merge even on patch updates because they require coordinated code changes (Stripe SDKs, React/React Native, `spring-boot-starter-parent`). The lists live as two env vars at the top of each project's `dependabot-automerge.yml` — the [canonical template](../20-templates/.github/workflows/dependabot-automerge.yml) carries the org defaults and the comments explaining each; edit those two lines to customize per project.

### What humans still review

- **Major version updates** — never auto-merged
- **Updates to packages on the exclusion list** — never auto-merged
- **Updates to packages on the patch-only list, when the update is minor** — never auto-merged
- **Updates that fail CI** — auto-merge is blocked by branch protection

Everything else flows through to `main` without human review.

### Releasing dependency updates

Dependabot PRs land with the `dependencies` label. The Release Drafter workflow (see `github-actions/RULES.md`) picks them up and buckets them under "🧰 Maintenance" in the next release draft. When the lead engineer publishes the release, all the bundled dep updates ship to production together.

This means: **don't manually create releases just for dep updates**. They batch into the next normal release.

### When CI catches a regression

If a dep update breaks tests, the PR sits open with a failing check; Dependabot sees the open PR and does not create a new one. A human investigates — roll back the version pin in `dependabot.yml` (skip this version), bump a downstream library, or fix the code — and once the PR is closed, Dependabot resumes. By design, a broken Monday update doesn't propagate forward.

## Automated updates outside Dependabot

Anything Dependabot doesn't cover (Coolify versions, system packages on the VPS, Java JDK versions in Docker base images for very-fresh releases) gets bumped manually. Document the version + date in the relevant stack rules file when you do.

## For AI agents

When adding a new dependency:

1. Use the package manager's query command to find the latest stable version
2. Pin it exactly in the manifest
3. Document the version + date in the relevant stack rules or app README
4. Verify the build / tests still pass

When updating an existing dependency:

1. Check whether a Dependabot PR already exists — if yes, point the user there instead of doing it manually
2. If no, use the latest stable version found via the steps above
3. Update the version note in docs alongside the manifest change
4. Run the full local verification commands before opening the PR

When you see `^`, `~`, `@v4` (without minor/patch), or `:latest` in a manifest **you are editing**, fix it as part of the change. When you see it in a manifest you are **not editing**, leave it alone and mention it to the user — drive-by fixes create noisy diffs.

When a Dependabot PR sits open with failing CI, do not "fix" it by force-pushing your own change unless explicitly asked. The right move is to investigate why it's failing and propose a path (rollback, code fix, version exclusion) to the developer.
