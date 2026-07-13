---
name: retro
description: Runs the plan → execute → validate pipeline as supervised sub-agents on a real task, observes each stage as it happens, diagnoses where the workflow or docs failed, and opens an improvement PR against KB-Documentation. Manually invoked only — never part of the standard workflow. Usage: /retro <task description>
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

# Skill: retro

## Purpose

Close the feedback loop between real client runs and the docs. The user hands this skill a real task; instead of the user running `/plan`, `/execute`, `/validate` themselves, **this skill runs the three skills itself** — one sub-agent per stage, sequentially, observing each stage as it happens. Live supervision captures what final artifacts can't show: "validate ran and found zero errors", "execute never opened `RULES.md`", "plan asked no questions about X".

The output is a PR against `K-B-Consultancy/KB---Documentation` that turns what went wrong (and what went right) into concrete doc/skill edits.

**Boundaries:**

- **Manually invoked only.** The plan/execute/validate specs do not reference this skill; a normal task never triggers it.
- The pipeline stages make their normal changes to the client repo — this is a real run, producing a real feature branch and PR. Retro's own analysis **never edits the client repo**.
- Complement, not overlap: `refine-workflow-skills` (lives only in KB-Documentation's `.claude/skills/`, so no link from here) audits the skill *specs* for coherence; retro gathers *run evidence* from a client repo and turns it into a docs PR.

## Setup

1. The argument is the task description — pass it to the plan stage verbatim.
2. Create the observation journal **outside the repo**: `RETRO_DIR=$(mktemp -d)`, journal at `$RETRO_DIR/journal.md`. It is never committed to the client repo.
3. Record in the journal: task description, repo, branch at start, timestamp.

## Stage loop — plan, then execute, then validate

For each stage, strictly in order:

### a. Spawn the stage sub-agent

One fresh sub-agent per stage (fresh context — the orchestrator holds only stage reports and verification results). Its prompt:

> Invoke the `<stage>` skill in this repository on this task: `<task / plan.md pointer>`. Follow the skill exactly. End your final message with a **run report**:
>
> - **Docs read** — every documentation file you actually opened (paths)
> - **Rules consulted vs. skipped** — which rules files informed a decision; which you knew existed but didn't read, and why
> - **Questions you wanted to ask** — anything you resolved by assumption because you couldn't ask the user
> - **Deviations** — every place you departed from the skill spec or the plan, and why
> - **Findings and fixes** — everything you found wrong and what you did about it
> - **(validate only) Every check run, including passes** — "browser walkthrough: 6/6 requirements passed" is signal, not silence

### b. Verify the stage contract (trust, but verify)

When the sub-agent finishes, independently check the repo against the stage's contract — never take the self-report's word for it:

| Stage    | Contract to verify                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| plan     | `docs/plan.md` exists, frontmatter `status: complete`, `### Test plan` filled (one artifact per functional requirement)                                      |
| execute  | One commit per phase matching the plan's `#### Commit message` lines, test artifacts present on the branch, no unfinished phases, `docs/session-handoff.md` present if the report claims an interruption |
| validate | PR opened, `fix(...)` commits for each finding it reported fixing, walkthrough table in the PR body complete (one row per requirement)                       |

### c. Journal both sides

Append to `$RETRO_DIR/journal.md`: the sub-agent's run report, the orchestrator's verification result, and **every discrepancy between them** (a report that claims a step the repo doesn't show is itself a finding).

### d. Gate the next stage

Only then start the next stage. A stage that fails its contract is a **first-class finding**, not an abort: decide continue/stop (can the next stage produce meaningful evidence on top of this state?) and record the decision and reason in the journal.

### User-input mediation

Sub-agents cannot talk to the user. When a stage needs a decision (plan's requirement questions, validate's judgment calls), the sub-agent must return with the open question; the orchestrator asks the user via AskUserQuestion, then **resumes the same sub-agent** (its context intact) with the answer. Log every round-trip in the journal — a stage needing many round-trips is itself a doc-gap signal. The plan stage's own side of this protocol — how it recognizes sub-agent mode and treats a relayed answer as gate approval — is spec'd in [`plan`'s Sub-agent mode](../plan/SKILL.md#sub-agent-mode); it is the canonical description of that behavior, not restated here.

## Analysis phase

After validate, read the journal **from disk** (`$RETRO_DIR/journal.md`) — not from conversation memory — and turn it into findings. Each finding:

```
Symptom → Evidence (journal entry / file / commit) → Root-cause bucket
```

The bucket determines the fix type:

| Root-cause bucket                                            | Fix in KB-Documentation                                                              |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Rule missing                                                  | Draft the new rule in the owning file (org-wide vs. stack per its AGENTS.md)          |
| Rule exists but wasn't read/discovered                        | Fix the reading path: `ROOT_AGENTS.template.md` links, skill read-lists               |
| Rule ambiguous (two agents would interpret it differently)    | Tighten the wording in place                                                          |
| Skill-contract gap (stage skipped a mandated step, or the contract itself is wrong) | Edit the skill spec in `ai-docs/skills/<stage>/SKILL.md`        |
| Client-specific quirk                                         | **Not a docs-repo edit** — suggest it for the client root `AGENTS.md` project-specific section, in the final report |

"Nothing went wrong at stage X" is also recorded — a clean stage is evidence the specs work.

## Output phase — the improvement PR

1. Shallow-clone the docs repo into the temp dir: `git clone --depth 1 git@github.com:K-B-Consultancy/KB---Documentation.git "$RETRO_DIR/kb-docs"`.
2. Branch: `docs/retro-<client-slug>-<YYYY-MM-DD>` (the `docs/` prefix per `NAMING.md`).
3. Apply the edits **following that repo's `AGENTS.md` workflow**: classify each edit into its bucket, keep one concept in one place, run the `audit-agent-docs` skill against the changed scope.
4. Open the PR (label `enhancement`). The description lists each finding **generalized** — that repo forbids client-specific content, so evidence is paraphrased ("a table shipped without pagination"), never client code or client names in rules. The PR body may name the source repo + PR once, for traceability. Paste the audit skill's output.
5. Report to the user: pipeline outcome (client PR URL), findings table, docs PR URL, and any client-specific suggestions for their root `AGENTS.md`.

## Stop conditions — mandatory

- Retro's analysis and output phases never edit the client repo; only the pipeline stages do, as part of their normal contracts.
- Never merge the docs PR — a human reviews it.
- If `gh` lacks access to `K-B-Consultancy/KB---Documentation`, stop after analysis and output the findings + proposed edits in the report instead of opening the PR.
- Client-specific quirks never become docs-repo edits (see the bucket table).
