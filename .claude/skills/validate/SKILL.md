---
name: validate
description: Verifies the feature branch against docs/plan.md by using the app the way a user would. Runs the package.json verification scripts context-lean (output to temp logs, only failures read back), then launches or attaches to the dev app, signs in as the seeded test user, and walks through every functional requirement in a real browser via Playwright MCP — at every viewport the project declares. Never runs against a production dataset. Fixes findings in this session (asking the user on judgment calls) instead of sending work back to the execute skill. When every requirement passes, pushes the branch and opens the PR.
model: claude-opus-4-7
allowed-tools:
  - Read
  - Edit
  - Write
  - Bash
  - Grep
  - Glob
  - AskUserQuestion
  - mcp__playwright
---

# Skill: validate

## Context for this session

Your complete context is:

1. `docs/plan.md` — what was supposed to be built (`## Requirements`) and how it was structured (phases)
2. The branch's commits: `git log --oneline main..HEAD` (substitute `master` where applicable)

Do not read planning notes or any other context.

If `git status` shows uncommitted changes, the execute skill did not finish. Stop and tell the user to re-run `execute` before validating.

**Not this skill's job:** line-by-line diff review. That is delegated to the GitHub Copilot PR review, which checks the diff against `AGENTS.md` and the plan's `#### Applicable rules for this task` table (both ride in the PR). This skill proves the requirements actually work for a real user.

---

## Stage 1 — Verification scripts (context-lean)

Run each affected app's `package.json` verification scripts (and the repo root's, if defined): **format check, lint, typecheck, test (including the E2E suite), build**. Every app has a test suite per org policy (`.ai-docs/00-org-wide/TESTING.md`); if one is missing, that is a finding to raise with the user — never synthesize a suite ad hoc. Execute already ran typecheck/lint per phase; this is the independent gate on the branch as a whole.

Keep output out of your context:

- **Always redirect** — never run a script bare:

  ```bash
  LOG_DIR=$(mktemp -d)
  pnpm run build > "$LOG_DIR/build.log" 2>&1; echo "build exit=$?"
  ```

- **Exit 0 → record `PASS`**; do not read the log.
- **Non-zero → read only the failure**: `grep -in "error" "$LOG_DIR/build.log" | head -30` plus the last ~20 lines. Handle via the [Findings protocol](#findings-protocol--fix-in-this-session).

All scripts must pass before the walkthrough begins.

---

## Stage 2 — Environment setup for the walkthrough

Stages 2–4 apply when at least one affected app has a web UI. If none does (API-only change), skip to [Record results](#record-results-and-commit) and put this exact line in the PR body's Verification section (the CI contract guard matches it verbatim): `Verification: scripts-only (no web UI walkthrough)`.

### Playwright MCP availability

The walkthrough uses the Playwright MCP browser tools (`mcp__playwright__*`). If unavailable, stop and tell the user to configure the server per `.ai-docs/00-org-wide/TESTING.md` § Agent-driven browser verification, then re-run this skill.

### Frontend dev server

Determine the app's dev command and port (from `apps/<name>/AGENTS.md`, `package.json` scripts, or the Vite/Next config), then check the port:

- **In use** → the user (probably) started it. Confirm it serves *this* app (`curl -s localhost:<port>`). Do not start a second instance.
- **Free** → start the dev server in the background, output to a temp log, wait until it responds. You started it → you stop it in [Cleanup](#cleanup--leave-no-traces).

### Backend

If the app needs a backend (API, Supabase, database), run the check commands from the plan's `### Verification prerequisites` table. A backend that is not running is the **user's** to start — AskUserQuestion, then re-check. Never run migrations, edit `.env` files, or start their backend services yourself.

### Data-safety gate (hard rule)

Before the first sign-in or click, positively confirm the app is **not pointing at production data**:

1. Read (read-only) the env the app runs with (`.env.local`, `.env.development`) and resolve the data source: `VITE_SUPABASE_URL`, `VITE_API_URL`, or the stack's equivalent.
2. The target must be `localhost`/`127.0.0.1`, **or** a URL/project ref the root `AGENTS.md` explicitly lists as non-production.
3. **Supabase:** a `*.supabase.co` URL can be production or dev — the hostname alone tells you nothing. Match the project ref against the `AGENTS.md` declaration, or ask.
4. Cannot positively confirm non-production → **STOP** and AskUserQuestion. Getting this wrong writes test data into a customer's production dataset.

### Test user

Sign in with the seeded test account: `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` from the app's untracked env file (ask the user if unset). Never use a real person's account. Never echo the password — not in command output, `docs/plan.md`, or the PR.

---

## Stage 3 — Viewports

Read `## Verification viewports` in the root `AGENTS.md`. Every journey in Stage 4 runs once per declared viewport.

If the section is missing (repo predates it), AskUserQuestion whether the project supports mobile, then append the section (format per `ROOT_AGENTS.template.md`) and commit separately: `docs: declare verification viewports in AGENTS.md`.

Standard sizes: **Desktop 1440×900** (always), **Mobile 390×844** (when declared).

---

## Stage 4 — Requirement walkthrough

**Test-plan cross-check first:** before walking anything through, verify every row of the plan's `### Test plan` has its artifact present on the branch (the spec file / Maestro flow / test method exists) and passing in Stage 1's results. A missing or failing artifact is a finding — resolve it via the [Findings protocol](#findings-protocol--fix-in-this-session) before the walkthrough.

For each unchecked item in the plan's `### Functional requirements`, derive a short user journey on the spot: entry point, steps, and the **user-visible outcome** that proves the requirement. Execute it in the browser once per declared viewport (`browser_resize` between passes; sign in once per pass).

Rules:

- **Work from accessibility snapshots** (the Playwright MCP default) — text, cheap on context, no files left behind. Screenshot only when a finding needs visual evidence, saved under the OS temp dir, never inside the repo.
- **Assert what the user sees** — the screen state after the action, per `TESTING.md`. A console log or network response is not a pass.
- **Exercise the edge cases the requirement names** (empty state, validation error, unauthorized) where reachable through the UI.
- **A requirement with no UI surface** → verify with a direct request against the dev backend, or cite the specific passing test from Stage 1. Say which in the results table.
- Record **PASS / FAIL per requirement per viewport** as you go.

This is interactive verification of *this branch* — it does not write Playwright spec files. Persistent E2E coverage was created during implementation: one checked-in artifact per requirement, per the plan's `### Test plan` (see `TESTING.md`).

---

## Findings protocol — fix in this session

A **finding** is a failed script, a failed journey, or a requirement that cannot be exercised. This session owns the fix — do not send work back to the execute skill.

1. **Diagnose the root cause first.** Never patch a symptom to make a journey pass.
2. **Environmental cause** (backend down, missing seed data, expired credentials, wrong env) → AskUserQuestion; the environment is the user's. Then re-check.
3. **Code defect with an unambiguous fix** → fix it, re-run the failing script, re-walk the affected journey (all declared viewports), commit: `fix(<scope>): <description>` per `COMMITS.md`.
4. **Judgment call** (multiple plausible behaviors, product question, fix contradicts the plan or spans many files) → AskUserQuestion **before** touching code.
5. User explicitly accepts a finding as-is → record under `### Open questions` in `docs/plan.md` and under `## Known issues` in the PR body.

Every finding ends as *fixed and re-verified* or *accepted and documented* — never silently unresolved.

---

## Cleanup — leave no traces

Before recording results:

- Close the browser session.
- Delete every temp artifact this run created (screenshots, logs, `$LOG_DIR`).
- Stop the dev server **only if this session started it**.
- Delete `docs/session-handoff.md` if it still exists — `execute` deletes it once all phases finish, so its presence here means execute skipped that step (or a prior run left it behind). Never let it reach the PR.
- `git status` must show only intended changes: `docs/plan.md`, a possible `AGENTS.md` viewport declaration, and `fix(...)` commits.

---

## Record results and commit

Update the `### Functional requirements` checklist in `docs/plan.md`:

- `- [x]` — passed the walkthrough at every declared viewport (or its documented non-UI verification)
- `- [ ]` — anything less (must have ended as an accepted finding to get this far)

```bash
git add docs/plan.md
git commit -m "docs(plan): mark requirements verified"
```

### Verify the commit history

Compare `git log --oneline main..HEAD` against each phase's `#### Commit message` in `docs/plan.md`: every phase commit present, in order. The plan skill's `docs(plan)` commits and this session's `fix(...)` commits are expected extras. If a phase commit is missing, or messages diverge without a deviation recorded in `docs/session-handoff.md`, stop and report to the user — never rewrite history from this skill.

---

## Push and open PR

Only when every requirement is verified and every finding resolved:

```bash
git push -u origin HEAD   # never push to main or master
```

```bash
gh pr create \
  --title "{{TASK_TITLE}}" \
  --body "$(cat <<'EOF'
## Summary

{{ONE_PARAGRAPH — what changed and why, from docs/plan.md context section}}

## Phases

{{LIST OF PHASE NAMES AND THEIR COMMIT MESSAGES}}

## Verification

Scripts (all apps affected):

| Command | Exit | Status |
|---|---|---|
{{ONE ROW PER SCRIPT}}

Requirement walkthrough (Playwright MCP, signed in as seeded test user, data target: {{e.g. "local Supabase — localhost:54321"}}):

| Requirement | Checked-in test | Desktop 1440×900 | Mobile 390×844 | Notes |
|---|---|---|---|---|
{{ONE ROW PER FUNCTIONAL REQUIREMENT — "Checked-in test" cites the artifact from the plan's ### Test plan; omit the Mobile column if desktop-only}}

Code review is delegated to the GitHub Copilot PR review on this PR.

{{IF the user accepted findings this run:
## Known issues
{{LIST — mirrored under ### Open questions in docs/plan.md}}
— otherwise omit this section entirely}}

🤖 Implemented via KB Consultancy plan → execute → validate workflow
EOF
)"
```

---

## Report to user

When the PR is open:

> Validation complete. All requirements verified in the browser ({{VIEWPORTS}}), verification scripts pass, and PR opened at: {{PR_URL}}

Include the PR URL, the walkthrough results table, and a one-line note per fix committed this session.
