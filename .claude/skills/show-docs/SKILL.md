---
name: show-docs
description: Toggles transparent documentation mode for the session. When enabled, every response starts with a numbered list of every documentation file read that turn (path + one-line reason), backed by Claude Code hooks for mechanical verification. Usage: /show-docs on | /show-docs off | /show-docs status
---

# Skill: show-docs

## Purpose

Make AI responses auditable. When enabled for a session, every response opens with a structured list of the exact documentation files consulted — path and one-line reason — so reviewers can verify the agent is reading the right rules before acting.

Claude Code hooks track every `Read` call independently, providing a mechanical ground-truth log alongside the model's self-reported list.

## Usage

```
/show-docs on      — enable for this session
/show-docs off     — disable
/show-docs status  — show current state
```

## What to do on invocation

### on

1. Run: `mkdir -p .claude && touch .claude/show-docs-enabled`
2. Confirm to the user: "show-docs mode enabled. Every response this session will start with a docs-consulted header."
3. From this point on, follow the output format below for every response.

### off

1. Run: `rm -f .claude/show-docs-enabled .claude/current-read-log.txt`
2. Confirm: "show-docs mode disabled."

### status

Check whether `.claude/show-docs-enabled` exists (`[ -f .claude/show-docs-enabled ]`). Report enabled or disabled.

---

## Output format (when mode is active)

Every response must open with this section before any other content:

```markdown
## Docs consulted
1. `<path-relative-to-repo-root>` — <one-line reason: why this file was relevant to this specific task>
2. `<path>` — <reason>

---
```

Rules:
- **List files in read order.**
- **Include only files that meaningfully influenced the response.** Do not list files you opened and found irrelevant.
- **Reasons must be specific.** "`react-base/RULES.md` — TanStack Query mutation pattern for this stack", not "`react-base/RULES.md` — rules".
- **If no documentation files were read** (purely conversational response): write `## Docs consulted` followed by `_none — no documentation lookup needed this turn_`.

---

## Mechanical verification (Claude Code hooks)

When the supporting hooks are installed, three of them run automatically while mode is active:

| Hook | Script | What it does |
|---|---|---|
| `UserPromptSubmit` | `inject-show-docs.sh` | Resets the read log; injects the output-format instruction into every prompt |
| `PostToolUse` on `Read` | `track-reads.sh` | Silently appends every file path read to `.claude/current-read-log.txt` |
| `Stop` | `verify-docs-read.sh` | Prints the ground-truth log as a verification footer after each response |

The verification footer shows every file actually passed to the `Read` tool. If it differs from the docs-consulted header in the response, the model either missed a file or listed one it did not read.

**These hooks are maintained in KB-Documentation (`ai-docs/scripts/hooks/`) but are NOT synced into client repos** — `sync-targets.yml` lists `hooks` under `render_skip`, so a client's `.claude/` has no hook scripts and `.claude/settings.json` does not wire them up. The mechanical verification therefore runs only in repos that install the hooks themselves (e.g. KB-Documentation).

If the hooks are not installed, show-docs mode still works via the output-format rule alone — you lose mechanical verification but keep the self-reported list. This is the normal case in client repos.
