---
name: assess
description: Audits how well a client repo aligns with the org docs (.ai-docs/) — one read-only sub-agent per app × dimension (testing, tooling, architecture, hygiene) — and produces docs/alignment-report.md plus a phased refactor docs/plan.md that the execute skill can run after human review. Manually invoked. Usage: /assess [app-name | all]
model: claude-opus-4-7
allowed-tools:
  - Read
  - Write
  - Bash
  - Grep
  - Glob
  - Agent
  - AskUserQuestion
---

# Skill: assess

## Purpose

Measure the gap between a client repo and the org rules, then turn that gap into an executable refactor plan. Use it on:

- **Inherited or graduated repos** — a Lovable graduation or a codebase written before (or without) the org docs
- **Drifted repos** — a client that stopped merging sync PRs or accumulated deviations
- **After a major docs release** — to see what existing clients now violate
- **Before quoting refactor work** — the report is the evidence for the estimate

This skill **never edits application code**. Its only outputs are `docs/alignment-report.md` and (on confirmation) `docs/plan.md`. The fix itself runs through the normal plan → execute → validate pipeline.

Boundaries with the neighbors: `code-reviewer` reviews **one diff** before a PR; `retro` observes a **live pipeline run** and PRs into KB-Documentation; assess audits a repo's **standing state** against the docs. No overlap in inputs or outputs.

## Phase 0 — Inventory (orchestrator, cheap)

1. `.ai-docs/` must exist. Missing → stop: tell the user to run the init script or merge the pending sync PR first; there is nothing to assess against.
2. Enumerate apps (`pnpm-workspace.yaml`, `apps/*/`) and detect each app's stack using the plan skill's detection table ([`plan/SKILL.md`](../plan/SKILL.md) § stack discovery).
3. Record the docs version being assessed against: `git log -1 --format=%h -- .ai-docs/` plus the date.
4. If the user passed an app name, scope to that app; default is all apps.

## Phase 1 — Fan-out (one read-only sub-agent per app × dimension)

| Dimension        | Sub-agent reads                                                                    | Checks                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **testing**      | `00-org-wide/TESTING.md` + the stack's `RULES.md` test sections                     | One named test artifact per functional requirement in the app's `README.md`; the suite exists and runs; test naming and placement |
| **tooling**      | `00-org-wide/CODE_QUALITY.md` + the stack's lint/format sections                    | Lint/format wiring (synced configs, not hand-written), CI workflows vs the `20-templates/.github/` versions, lefthook, strict `tsconfig` / Spotless + Error Prone |
| **architecture** | The stack's `RULES.md` (+ `react-base/RULES.md` for React stacks)                   | Project structure, layering, state management, API client, naming, the stack's "For AI agents" rules                              |
| **hygiene**      | `20-templates/ROOT_AGENTS.template.md` + app templates, `SECRETS.md`, `DEPENDENCIES.md` | Root and per-app `AGENTS.md`/`README.md` present and accurate, env/secrets conventions, exact-pinned dependencies                  |

Repo-level concerns (root `AGENTS.md`, root CI, lefthook) are checked once, by the first app's tooling/hygiene agents — instruct the others to skip them so findings aren't duplicated.

Each sub-agent's prompt:

> Read only the docs listed for your dimension and the code of `apps/<name>`. You are read-only — no edits. Return findings as lines of `rule (doc file § section) | violation | evidence (file:line) | severity | one-line fix`, highest severity first, max 30 (state the overflow count if you hit the cap). Severity: **blocker** (violates a hard rule or breaks the pipeline — e.g. no test suite, hand-written lint config, prod credentials in code), **major** (clear rule violation with refactor cost — e.g. `useQuery` in components, missing pagination), **minor** (naming, ordering, cosmetics). End with a short "compliant" list — rules this app demonstrably follows, with one piece of evidence each.

The orchestrator holds only these structured reports — never raw file contents from sub-agents.

## Phase 2 — Report

Write `docs/alignment-report.md`:

- Header: date, docs version from Phase 0, apps assessed
- **Scorecard**: one row per app × dimension with blocker/major/minor counts
- Findings per dimension, severity-ordered, deduplicated (same file + same rule found by two dimensions → keep the more specific one)
- The **compliant list** — what already matches the rules is evidence, not noise
- **Out of scope** section: anything that is really feature work or a rewrite (touches more than ~10 files for one finding) — name it, state its rough size (files touched, order-of-magnitude effort), and mark it "quote separately"; it does not go in the refactor plan

## Phase 3 — Refactor plan

Convert every **blocker and major** (minors stay in the report) into `docs/plan.md`, in exactly the format the plan skill produces ([`plan/SKILL.md`](../plan/SKILL.md) owns the format — do not improvise sections):

- Each requirement is one alignment gap, phrased as the target state ("all tables server-side paginated"), citing the rule
- Phases are small and mechanical; each phase's test plan row follows plan's `### Test plan` rules (a tooling fix's artifact is the CI job or hook that proves it — see [`plan/SKILL.md`](../plan/SKILL.md))
- Ordering: tooling first (lint/CI catch regressions during the rest), then architecture, then testing gaps

Hand off exactly the way plan does, so execute's preconditions hold: create the feature branch per plan's branch-setup rules ([`plan/SKILL.md`](../plan/SKILL.md), `TASK_SLUG` = `align-<app|repo>`), then commit `docs/alignment-report.md` and `docs/plan.md` (`docs(plan): alignment assessment and refactor plan`) — execute treats a dirty tree as an interrupted session.

Then present the summary (scorecard + planned phases + out-of-scope list) via AskUserQuestion:

- **Approve** → set `status: complete`, amend the commit; the user runs `/execute` in a fresh session
- **Report only** → leave `status: requirements-only`; the plan is a committed draft for later review

## Stop conditions — mandatory

- Writes only `docs/alignment-report.md` and `docs/plan.md`. Never edits app code, configs, or `.ai-docs/`.
- Never opens PRs or commits fixes — the pipeline owns that.
- Never sets `status: complete` without explicit user approval in Phase 3.
- A finding against a rule the repo's root `AGENTS.md` explicitly excepts (project-specific section) is recorded as "excepted", not as a violation.
- If the same finding suggests the *docs* are wrong rather than the code (several apps deviate the same way for a good reason), say so in the report — that is a KB-Documentation docs PR, not refactor material.
