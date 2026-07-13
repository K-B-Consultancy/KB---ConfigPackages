---
name: execute
description: Executes the phases in docs/plan.md one at a time, committing each phase with its planned commit message once its verification passes. Runs in a clean session seeded only from docs/plan.md, and only when the plan is marked status complete. Enforces a feature branch, never pushes, and never touches main. Hands off to the validate skill when all phases are done — validate owns the user-level verification, the push, and PR creation.
model: claude-sonnet-4-6
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Agent
---

# Skill: execute

## Context for this session

Your complete context is `docs/plan.md` — requirements (what and why) plus the phased technical implementation (how). Read it in full before touching any files. Do not read commit messages, chat history, or planning notes. If you have prior conversation history beyond this input, you are in the wrong context — stop and restart correctly.

---

## Prerequisites

Verify before starting:

- [ ] `docs/plan.md` exists with frontmatter `status: complete` (check: `head -5 docs/plan.md | grep -q 'status: complete'`). The `plan` skill (or `assess`, for alignment-refactor plans) sets this only after both the human-reviewed requirements AND the phased `## Technical implementation` are written.
- [ ] You are **not** on `main` or `master` (`git branch --show-current`). The `plan` skill creates a `plan/{{TASK_SLUG}}` branch — you should already be on it. If somehow on a protected branch: `git checkout -b feat/{{TASK_SLUG}}`.
- [ ] Working tree is clean (`git status`). Completed phases are individual commits, so `git log` shows how far a previous session got. Dirty tree = a previous session was interrupted mid-phase: read `docs/session-handoff.md` and resume that phase from the uncommitted changes.

If the status check fails, the plan is requirements-only. Do not execute and do not create the missing section yourself. Tell the user verbatim, then **stop**:

> `docs/plan.md` is not marked `status: complete` — the plan skill's Phase 2 (Technical implementation) never ran. Start a fresh Opus session, run `/plan`, approve the requirements at its review question, and let it append the numbered phases. Then re-run `/execute` in a fresh Sonnet session.

**Never push — to `main`, `master`, or anywhere else.** This skill commits each phase locally. The user-level verification, push, and PR are the `validate` skill's responsibility.

---

## Execution loop

For each phase under `## Technical implementation`:

### Step 1 — Context checkpoint (mandatory, before every phase)

Check your remaining context window. **At or below 50% remaining:**

1. Write `docs/session-handoff.md`:

   ```markdown
   # Session handoff — {{TASK_TITLE}}

   ## Completed phases

   | Phase              | Status      |
   | ------------------ | ----------- |
   | Phase 1 — {{name}} | Implemented |

   ## Next phase

   Phase {{N}} — {{name}}

   ## Deviations from docs/plan.md

   - {{DEVIATION_1 or "none"}}

   ## Open questions for orchestrator

   - {{QUESTION or "none"}}
   ```

2. Tell the user:

   > Context is at [X]% remaining. Handoff written to `docs/session-handoff.md`. Please start a fresh Sonnet session and run the `execute` skill — it will resume from Phase {{N}}. Completed phases are already committed; do not clean the working tree or rewrite history between sessions.

3. **Stop.** Do not continue in this context.

**Resuming:** if `docs/session-handoff.md` exists at session start, read it first and continue from its "Next phase". Completed phases are already committed (`git log` confirms) — do not re-implement them.

### Step 2 — Read the phase

Read the full phase definition before writing any code: goal, affected files, verification commands.

### Step 3 — Implement

Make only the changes described in this phase. Do not implement future phases opportunistically — strict phase boundaries keep changes reviewable.

### Step 4 — Verify

Run every verification command listed in the phase, then **always** typecheck and lint (from the affected app's `AGENTS.md` or `package.json` scripts), regardless of whether the phase lists them.

Run commands with low-output reporting:

```bash
LOG_FILE=$(mktemp)
if <command> >"$LOG_FILE" 2>&1; then
  echo "PASS | <command> | exit=0"
else
  echo "FAIL | <command> | exit=$?"
  head -n 30 "$LOG_FILE"; echo "---"; tail -n 30 "$LOG_FILE"
fi
```

Fix failures before moving on. A phase is not complete until all checks pass.

Retry policy (strict): before any retry, diagnose the failure's root cause. Allow up to 2 attempts against the *same* root cause (the retry must follow a concrete code/config change that plausibly addresses that cause) — if the second attempt against that cause fails, stop the phase and ask the user (or hand off via `docs/session-handoff.md` if context is low). A retry that targets a genuinely *different* root cause than the previous attempt does not count against that cause's 2-attempt cap — but the command may never receive more than 4 attempts total regardless of how many distinct causes are found; the 4th failure always stops the phase and asks the user. Record every distinct root cause tried in `docs/session-handoff.md` if the phase bounces back.

**Run every test command the phase lists.** The plan's `### Test plan` names each functional requirement's test artifact, and the phase implementing a requirement is not committable until that named test passes. If a listed test cannot run (suite or tooling missing), that is a [deviation](#deviations) — do not improvise an ad-hoc suite and do not skip silently.

### Step 4b — Stack-rule check

Before committing, check this phase's changes against the stack rules the plan recorded: re-read the plan's `#### Applicable rules for this task` table and self-check each rule against this phase's diff.

If a rule cannot be satisfied without changing the plan, stop and follow [Deviations](#deviations) — never commit deviating code silently.

### Step 5 — Commit the phase

Stage exactly the files this phase created or modified and commit with the phase's `#### Commit message`:

```bash
git add <files this phase created or modified>   # never git add .
git commit -m "{{PHASE_COMMIT_MESSAGE}}"
```

If the implementation deviated from the planned file list (with user approval — see Deviations), commit what was actually changed and record the difference in `docs/session-handoff.md`. **Never push.**

### When all phases are complete

Run every verification command in every affected app's `AGENTS.md`. All must pass. Delete `docs/session-handoff.md` if it exists — it has no further use once every phase is committed, and a stale handoff from a finished task confuses the start of the next session. Then tell the user:

> All phases implemented, verified, and committed — one commit per phase, nothing pushed. Please start a fresh Opus session and run the `validate` skill, which will verify the requirements by driving the app in a browser, fix any findings with you, push the branch, and open the PR.

**Stop.** The push and PR belong to `validate`.

---

## Deviations

If a phase cannot be executed as written (file no longer exists, approach conflicts with a dependency's API, etc.), **do not improvise silently**. Stop, describe the problem, and ask the user whether to:

1. Update `docs/plan.md` and continue
2. Return to the `plan` skill to redesign the affected phases

Either way, record the deviation and its reason under "Deviations from docs/plan.md" in `docs/session-handoff.md` (create if missing). Never skip a phase or substitute a different approach without user confirmation.

---

## Sub-agents to use during execution — if available

Org sub-agents are **not** synced into client repos (only skills are — see `render_skip` in KB-Documentation's `sync-targets.yml`). Treat these as optional helpers: use them when `.claude/agents/<name>.md` exists in this repo (check the `Agent` tool's available types); otherwise do the work inline. Never block a phase on an agent that isn't installed.

| When                                                     | Sub-agent (if present) | Fallback if absent                                                              |
| -------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| Running and verifying E2E tests                          | `browser-tester`       | Run the project's E2E command directly and read the output                     |
| Validating a SQL migration                               | `db-query-validator`   | Review the migration by hand against the schema                                |
| Debugging a failing verification command                 | `debugger`             | Debug inline from the command output                                            |
