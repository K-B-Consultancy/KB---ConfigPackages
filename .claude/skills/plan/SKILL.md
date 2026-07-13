---
name: plan
description: Drives the planning phase of a task. Gathers requirements through structured follow-up questions, writes the Requirements section of docs/plan.md (human-reviewed gate), then appends a phased Technical implementation section for the execute skill to follow. Stops before any application code is written.
model: claude-opus-4-7
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - AskUserQuestion
---

# Skill: plan

Run with **Claude Opus** (reasoning depth for requirements extraction and phased design). Execution uses Sonnet — see [`execute`](../execute/SKILL.md).

## Purpose

Convert a vague task description into one reviewed artifact: `docs/plan.md` — Requirements (what and why, human-reviewed) followed by a phased Technical implementation (how, for the execute skill to follow mechanically). This skill **writes no application code**.

---

## Phase 1 — Requirements gathering

### Branch setup

Before writing anything to disk, ensure you are on a feature branch. `TASK_SLUG` is a kebab-case slug of the task title (e.g. "Add user auth" → `add-user-auth`).

```bash
CURRENT=$(git branch --show-current)
if [ "$CURRENT" = "main" ] || [ "$CURRENT" = "master" ]; then
  git checkout -b plan/{{TASK_SLUG}}
fi
# If already on a non-default branch, reuse it — do not create a second branch.
```

Never commit plan artifacts to `main` or `master`.

### Interview

Open with:

> Interview me to find the real goal of this project. Bias towards small compartmentalized specs. Make me verify key decisions explicitly so nothing is missed.

**Do not fill in blanks yourself.** Ask follow-up questions (via AskUserQuestion, max 3–4 per round) until all of these are answered without guessing:

- **Scope:** explicitly in / explicitly out
- **Functional requirements:** what the system must do + acceptance criteria per requirement
- **Non-functional requirements:** performance, security, accessibility, other constraints
- **Data model impact:** existing entities touched, new ones, relationship changes
- **Integration points:** other apps, APIs, external services
- **Edge cases:** invalid inputs, dependency failures, error states
- **Dependencies:** what must be true before work starts (PR merged, API contract agreed)
- **Documentation impact:** which docs must change — at minimum check the affected app's `README.md` and `AGENTS.md`, the root `README.md`, and `docs/DATA_MODEL.md` if the data model changes. Every doc that would drift is a requirement, not an afterthought.
- **Reachability:** for any existing UI surface (page, component) the task's premise names as live, confirm it is actually mounted — reachable via a route or a rendered parent — not just present in the file tree. `grep` finds files that exist; it does not find surfaces a user can reach. Trace the import chain from the router (or app entry point) to the file before listing it in `### Affected apps / services`. A file with no reachable mount point is dead code, not scope — say so explicitly rather than treating it as a live target.

If the stated premise disagrees with the code — the task description assumes a behavior, component, or data flow that the codebase does not actually have — surface that mismatch to the user **before** drafting any requirement from the stated premise. Do not silently write requirements around an incorrect premise; do not silently "correct" it either. State the discrepancy plainly and let the user decide how to proceed.

### Write requirements continuously

Keep the Requirements section of `docs/plan.md` current — update after every follow-up round, not at the end.

The `status` frontmatter is the machine-checkable completeness flag: `execute` refuses anything other than `status: complete`, which is set only at the end of Phase 2. Never set `complete` in Phase 1. (The `assess` skill is the one other legitimate producer of `docs/plan.md` — same format, same human-approval gate before `complete`.)

```markdown
---
status: requirements-only
---

# Plan — {{TASK_TITLE}}

## Requirements

### Context
{{ONE_PARAGRAPH_WHY — what problem this solves and why now}}

### Functional requirements
- [ ] {{REQUIREMENT_1}} — acceptance criteria: {{CRITERIA}}
- [ ] {{REQUIREMENT_2}} — acceptance criteria: {{CRITERIA}}

### Non-functional requirements
- {{CONSTRAINT_1}}

### Documentation updates
Treat each as a functional requirement — `validate` checks these against the diff like any other.
- [ ] `apps/{{APP_NAME}}/README.md` — {{what must change to reflect this work}}
- [ ] `README.md` (root) — {{update if the change affects the apps table / overview, else delete this line}}
- [ ] {{OTHER_DOC — e.g. `apps/{{APP_NAME}}/AGENTS.md` for a new verification command, `docs/DATA_MODEL.md` for a model change}}

### Out of scope
- {{EXPLICIT_EXCLUSION_1}}

### Open questions
- {{QUESTION_STILL_UNRESOLVED}} — owner: {{WHO}}

### Affected apps / services
| App / service | What changes |
|---|---|
| `apps/{{APP_NAME}}` | {{summary}} |
```

### Gate: mandatory human review

When requirements feel complete, write the final Requirements section and commit locally (do **not** push — that happens at the end of Phase 2):

```bash
git add docs/plan.md
git commit -m "docs(plan): add requirements for {{TASK_TITLE}}"
```

Then gate on explicit approval **inside this session** via AskUserQuestion — do not end the session and wait for a new message. Ask:

> Requirements are written to `docs/plan.md` and committed locally. Review the file now — does it capture the task correctly?

1. **Approve — continue to technical design** → proceed to Phase 2 in this session.
2. **I have corrections** → collect them, update Requirements, amend the commit, ask again.

Blocking on the tool keeps the session alive through the review. If the session is interrupted anyway, `status: requirements-only` stops `execute` from running against the incomplete plan. Do **not** start Phase 2 until the user picks option 1.

---

## Sub-agent mode

`AskUserQuestion` blocks on a human — it is unavailable when this skill is invoked as a sub-agent by an orchestrator (e.g. the `retro` skill running plan → execute → validate as supervised sub-agents; see its [User-input mediation](../retro/SKILL.md#user-input-mediation)). Detect sub-agent mode from the invoking prompt (it identifies itself as an orchestrator and states it will relay questions). In that mode:

- **Never call `AskUserQuestion`.** Gather what you can from the interview questions, then commit `docs/plan.md` with `status: requirements-only` as usual.
- **Return, don't block.** Instead of gating in-session, end your turn with the open questions the human review would have asked, formatted as a plain numbered list under a `## Questions for the user` heading in your response (not written into `docs/plan.md`).
- **The caller relays and resumes.** The orchestrator asks the user via its own `AskUserQuestion` and resumes this same sub-agent (same context, same branch) with the answers.
- **A relayed answer is the gate approval.** Once the orchestrator resumes with answers — including a bare "approved" for the review question in [Gate: mandatory human review](#gate-mandatory-human-review) — treat that as option 1 (approve) and proceed to Phase 2 without asking again. Do not re-ask a question the orchestrator already answered.
- Everything else in this skill (branch setup, Requirements format, Phase 2 mechanics, stop conditions) is unchanged in sub-agent mode.

---

## Phase 2 — Technical implementation design

### Stack discovery

Before writing implementation steps, identify the stacks of the affected apps and read their rules.

#### 1. Detect the stack

For each app in `### Affected apps / services`, inspect its directory:

| Signal | Stack(s) to read |
|---|---|
| `next.config.ts` / `next.config.js` | `nextjs/RULES.md` + `react-base/RULES.md` |
| `payload.config.ts` | `payload/RULES.md` + `nextjs/RULES.md` + `react-base/RULES.md` |
| `vite.config.ts` (no Next.js) | `vite/RULES.md` + `react-base/RULES.md` |
| `@tanstack/react-start` in `package.json` or `app/router.tsx` | `tanstack-start/RULES.md` + `react-base/RULES.md` |
| `app.json` / `app.config.ts` with `"expo"` key, or `expo` / `expo-router` in `package.json` | `react-native/RULES.md` + `react-base/RULES.md` |
| `pom.xml` | `spring-boot/RULES.md` |
| `.github/workflows/` files in scope | `github-actions/RULES.md` |

Also read `00-org-wide/COMMITS.md` for the conventions every phase's `#### Commit message` must follow, and `00-org-wide/DEPENDENCIES.md` whenever the plan adds or upgrades a package (exact-version policy, approved sources).

> Rules live at `.ai-docs/10-stacks/<stack>/RULES.md` in client repos, `ai-docs/10-stacks/<stack>/RULES.md` in KB-Documentation itself. Try `.ai-docs/` first; fall back to `ai-docs/`.

#### 2. Read the rules

Read each identified RULES.md in full, focusing on sections relevant to the task (data-layer rules for data-model tasks, routing/metadata rules for new pages, etc.).

#### 3. Record the stack context in the plan

Add a `### Stack context` section immediately after the `## Technical implementation` header. Summarise **only the rules that apply to this task**. The execute skill runs without access to the RULES.md files — every constraint it needs must appear here.

### Append the Technical implementation section

This section is the execution script: Sonnet follows it phase by phase without access to this planning conversation. It must be:

- **Complete** — every file to create or modify named explicitly; no "figure it out from the code."
- **Sequential** — phases don't depend on each other out of order.
- **Committable** — each phase leaves the codebase working (or at minimum non-broken).
- **Testable** — each phase ends with specific verification commands. Always include typecheck and lint; a phase that implements a functional requirement also runs that requirement's test from `### Test plan`.
- **Tested** — every functional requirement has exactly one named test artifact in `### Test plan` (org policy: `00-org-wide/TESTING.md`), created in the same phase that implements the requirement. If an affected app has no test suite (or lacks the E2E suite specifically), insert a dedicated suite-setup phase before the feature phases — never skip the test plan. That suite-setup phase's `#### Verification` must run the app's **pre-existing test script** (e.g. `pnpm test` for an existing Vitest suite) in addition to installing/wiring the new one — new test tooling that collides with an existing one (e.g. a Playwright config matched by the Vitest include glob) is a broken phase, and only running the pre-existing suite catches it. For pure tooling/config requirements (lint wiring, CI jobs), the named artifact is the CI job or hook that proves the wiring — a requirement with no testable surface does not get an invented test.
- **Disjoint files** — each file appears in at most one phase (execute commits each phase in isolation).
- **Preflightable** — `### Verification prerequisites` lists every environmental condition the verification and walkthrough depend on (running backend, env vars, seeded test user), each with a shell check command. The validate skill runs these before its browser walkthrough and asks the user to fix failures (backends and env files are the user's, never the skill's). Write `none` when the whole suite runs offline **and** there is no UI to walk through.

```markdown
---

## Technical implementation

### Stack context

| App | Stack | Rules files consulted |
|---|---|---|
| `apps/{{APP_NAME}}` | {{STACK — e.g. "Next.js + Payload"}} | {{RULES.md files actually read}} |

#### Applicable rules for this task

Every rule below is a constraint the execute skill must satisfy. Each row cites the source file + heading — that is how a reviewer distinguishes real rules from paraphrase.

| # | Rule | Source | How to verify in the diff |
|---|---|---|---|
| R1 | {{one-line imperative rule, e.g. "DB client is imported only in files starting with `import 'server-only';`"}} | {{`nextjs/RULES.md` § Data layer}} | {{a grep-able check, e.g. "`grep -rL \"^import 'server-only';\" src/dal/**/read.ts` returns nothing"}} |
| R2 | ... | ... | ... |

> **Note for the execute skill:** the full RULES.md files are not in your context. This table is your complete stack-rule brief — treat every row as a hard requirement. If a phase cannot satisfy a rule, stop and follow the execute skill's Deviations protocol.
>
> **Note for reviewers:** this table rides into the PR inside `docs/plan.md`. The GitHub Copilot PR review and the human reviewer use it to check the diff — the validate skill verifies requirements in the running app, not the diff.

### Test plan

One row per functional requirement. The test type follows the stack (per `00-org-wide/TESTING.md`); how to write it is in the stack's RULES.md § Tests. The artifact is created in the same phase that implements its requirement, and that phase's `#### Verification` runs the `Run with` command.

| Requirement | Test type | Test artifact | Run with |
|---|---|---|---|
| {{REQ_1}} | {{Playwright E2E \| Maestro flow \| Spring BDD test method}} | {{e.g. `e2e/order-creation.spec.ts` › "a signed-in user can create an order" \| `.maestro/flows/order-creation.yaml` \| `OrderControllerTest.givenUser_whenCreatingOrder_thenOrderIsListed`}} | {{e.g. `pnpm exec playwright test order-creation` \| `maestro test .maestro/flows/order-creation.yaml` \| `./mvnw test -Dtest=OrderControllerTest`}} |

<!-- If an affected app has no test suite, add a dedicated suite-setup phase before the feature phases (see 00-org-wide/TESTING.md). Never omit this section. -->

### Prerequisites
- Requirements reviewed and confirmed ✓
- {{OTHER_PREREQUISITE — e.g., "API contract agreed: see Requirements#integration-points"}}

### Verification prerequisites

| Prerequisite | Check command |
|---|---|
| {{ENVIRONMENTAL_CONDITION — e.g. "Backend API running on :8080"}} | `{{e.g. curl -sf http://localhost:8080/actuator/health}}` |
| {{FOR UI TASKS — e.g. "Test user seeded, creds in .env.local"}} | `{{e.g. grep -q TEST_USER_EMAIL apps/web/.env.local}}` |

<!-- Single row with `none` in both columns if everything runs offline AND there is no UI to walk through. -->

---

### Phase 1 — {{PHASE_NAME}}

**Goal:** {{one sentence — codebase state after this phase}}

#### Files to create
- `path/to/new-file.ts` — {{one-line purpose}}

#### Files to modify
- `path/to/existing.ts` — {{what changes and why}}

#### Implementation steps
1. {{STEP_1 — specific enough that Sonnet can execute without guessing}}
2. {{STEP_2}}

#### Verification
\`\`\`bash
# Use the project's actual toolchain: pnpm for React stacks (per react-base/RULES.md),
# ./mvnw for Spring Boot. Never write `npm` for a pnpm project.
{{TYPECHECK_COMMAND — e.g. pnpm run typecheck}}
{{LINT_COMMAND — e.g. pnpm run lint}}
# The `Run with` command for every `### Test plan` row this phase implements.
\`\`\`

#### Commit message
\`feat({{scope}}): {{description}}\`

---

### Phase 2 — {{PHASE_NAME}}

...

---

### Final phase — Validate and open PR

When all phases are complete and verified, run the `validate` skill in a fresh Opus session. See [`validate`](../validate/SKILL.md).
```

### Commit and push the completed plan

When the full plan is written, flip the frontmatter to `status: complete`, then:

```bash
git add docs/plan.md
git commit -m "docs(plan): add technical implementation for {{TASK_TITLE}}"
git push -u origin HEAD
```

Then stop and output verbatim (the "PLAN COMPLETE" signal tells the user it is safe to clear context):

> ✅ **Plan complete.** `docs/plan.md` now contains Requirements + Technical implementation (`status: complete`), committed and pushed to `origin/{{BRANCH}}`.
>
> Start a fresh Sonnet session and run `/execute`.

### Rules for phase design

- **No phase touches more than 3–5 files.** Larger → split.
- **No file appears in more than one phase** (phases must commit in isolation), **except a move-then-improve migration**: a phase that only relocates a file (`git mv`, no content change) may be followed by a later phase that edits the relocated file's contents. Mark the exception explicitly in the later phase's Goal line (`> Migration exception: continues path/to/file.ts from Phase {{N}}`) and confirm the move phase's diff is a pure rename with no behavior change (`git show --stat` shows only the rename, no content hunk).
- **Database migrations are their own phase**, always before the application code that uses them.
- **Contract-breaking changes** (API shape, shared types) are their own phase; downstream consumers update in a subsequent phase.
- **Documentation updates ship with the code they describe.** Every `### Documentation updates` item must appear in some phase's `#### Files to modify` — alongside the code, or as a dedicated final docs phase when the change spans several phases. A plan that changes behavior but lists no `README.md`/`AGENTS.md` edit is incomplete.
- **Tests ship with the requirement they prove.** The phase that implements a functional requirement also creates/updates the test artifact named for it in `### Test plan`, and the phase's verification runs it.
- **Each phase has exactly one commit message.** If you can't write one coherent message, the phase does too much.

---

## Stop conditions

- Do not write any application code.
- Do not run shell commands beyond reading file structure, except: the one-time branch setup, two `git add / commit` calls (end of each phase), and one `git push -u origin HEAD` at the end of Phase 2.
- Do not start Phase 2 without explicit user confirmation of Requirements.
- When `docs/plan.md` is complete, stop and tell the user to run the `execute` skill.
