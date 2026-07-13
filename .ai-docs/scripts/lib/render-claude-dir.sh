#!/usr/bin/env bash
# render-claude-dir.sh — regenerate .claude/ from .ai-docs/.
#
# This is the SINGLE source of the `.ai-docs/ -> .claude/` mapping. It is called by:
#   - .github/workflows/sync-to-clients.yml      (CI, after rsyncing .ai-docs/)
#   - .ai-docs/scripts/sync-docs.sh              (manual local pull)
#   - .ai-docs/scripts/init-client-monorepo.sh   (first-time project init)
#
# Claude Code discovers project agents/skills/hooks under .claude/. The source of
# truth is .ai-docs/; the files under .claude/ are GENERATED COPIES that we COMMIT,
# so a fresh clone (or a CI runner, or a new dev machine) works with zero local
# setup. Only runtime/session files under .claude/ are gitignored.
#
# Idempotent: safe to run repeatedly. Re-running fully reconciles .claude/ to match
# the current source.
#
# Usage: render-claude-dir.sh <repo-root> [<source-ai-docs-dir>]
#
# Source of agents/skills/hooks (arg 2): the agent/hook SPECS and the client-facing
# skill SPECS are no longer carried in a client's .ai-docs/ — they live only under
# .claude/ (committed). So the renderer reads those sources from the UPSTREAM
# KB-Documentation checkout passed as arg 2: agents/hooks and client-facing skills from
# `ai-docs/`. During sync that's the source repo; at init it's the freshly extracted
# tarball. Arg 2 defaults to <repo-root>/.ai-docs for backwards-compat, but a client's
# own .ai-docs/ no longer contains those sources, so a standalone run with no arg-2
# finds nothing to render and leaves the committed .claude/ org items intact.
#
# Note: the upstream repo's own `.claude/` is intentionally NOT a render source.
# Repo-local maintainer skills (e.g. audit-agent-docs) live only in KB-Documentation
# and must not propagate to clients.

set -euo pipefail

ROOT="${1:?usage: render-claude-dir.sh <repo-root> [<source-ai-docs-dir>]}"
SRC="${2:-$ROOT/.ai-docs}"
CLAUDE_DIR="$ROOT/.claude"
# Space-separated list of categories to skip (agents, skills, hooks).
# Set by the caller (e.g. sync-to-clients.yml reads render_skip from sync-targets.yml).
RENDER_SKIP="${RENDER_SKIP:-}"

# Returns 0 (true) if the given category name is in RENDER_SKIP.
_skip() { echo " $RENDER_SKIP " | grep -qw "$1"; }

if [ ! -d "$ROOT/.ai-docs" ]; then
  echo "Error: $ROOT/.ai-docs not found. Sync .ai-docs/ before rendering .claude/." >&2
  exit 1
fi

# ─── Reconcile only what WE own; never touch project-local additions ─────────
# A client repo may add its own project-specific agents/skills/hooks under .claude/.
# We must not wipe those. So instead of `rm -rf` the whole category, we track the
# exact paths this script generated last run in a manifest, remove only those, then
# regenerate and rewrite the manifest. Anything not in the manifest (i.e. project-local)
# is left untouched. This also correctly removes an org item that was deleted upstream.
MANIFEST="$CLAUDE_DIR/.org-managed"

# Only reconcile org agents/skills/hooks when a real source is available. A client's
# own .ai-docs/ no longer carries these sources (they live committed under .claude/),
# so a standalone run with no upstream source must NOT delete the manifested entries —
# doing so would wipe the committed org items with nothing to regenerate them from.
if [ -d "$SRC/agents" ] || [ -d "$SRC/skills" ] || [ -d "$SRC/scripts/hooks" ]; then
  NEW_MANIFEST="$(mktemp)"

  # Delete the entries we created on the previous run (org-managed only).
  if [ -f "$MANIFEST" ]; then
    while IFS= read -r rel; do
      [ -n "$rel" ] || continue
      rm -rf "$CLAUDE_DIR/$rel"
    done < "$MANIFEST"
  fi

  # ─── agents: flat *.md  →  .claude/agents/*.md ─────────────────────────────
  if [ -d "$SRC/agents" ] && ! _skip "agents"; then
    mkdir -p "$CLAUDE_DIR/agents"
    for agent_md in "$SRC"/agents/*.md; do
      [ -e "$agent_md" ] || continue
      cp -f "$agent_md" "$CLAUDE_DIR/agents/"
      echo "agents/$(basename "$agent_md")" >> "$NEW_MANIFEST"
    done
  fi

  # ─── skills: <name>/SKILL.md  →  .claude/skills/<name>/SKILL.md ────────────
  # Claude Code requires the directory-per-skill layout (.claude/skills/<name>/SKILL.md).
  # We copy the whole skill directory so bundled resources (scripts/, references/) travel too.
  # Only client-facing skills under ai-docs/skills/ are propagated; the upstream repo's
  # own .claude/skills/ is intentionally not a source (see header).
  if [ -d "$SRC/skills" ] && ! _skip "skills"; then
    mkdir -p "$CLAUDE_DIR/skills"
    for skill_md in "$SRC"/skills/*/SKILL.md; do
      [ -e "$skill_md" ] || continue
      name="$(basename "$(dirname "$skill_md")")"
      mkdir -p "$CLAUDE_DIR/skills/$name"
      cp -R "$(dirname "$skill_md")/." "$CLAUDE_DIR/skills/$name/"
      echo "skills/$name" >> "$NEW_MANIFEST"
    done
  fi

  # ─── hooks: scripts/hooks/*.sh  →  .claude/hooks/*.sh (executable) ─────────
  if [ -d "$SRC/scripts/hooks" ] && ! _skip "hooks"; then
    mkdir -p "$CLAUDE_DIR/hooks"
    for hook_sh in "$SRC"/scripts/hooks/*.sh; do
      [ -e "$hook_sh" ] || continue
      cp -f "$hook_sh" "$CLAUDE_DIR/hooks/"
      chmod +x "$CLAUDE_DIR/hooks/$(basename "$hook_sh")"
      echo "hooks/$(basename "$hook_sh")" >> "$NEW_MANIFEST"
    done
  fi

  # Record the org-managed set for the next run, then drop empty category dirs we
  # created but didn't fill (e.g. agents/ when there are no org agents this run).
  mkdir -p "$CLAUDE_DIR"
  sort -u "$NEW_MANIFEST" > "$MANIFEST"
  rm -f "$NEW_MANIFEST"
  for cat in agents skills hooks; do
    [ -d "$CLAUDE_DIR/$cat" ] && rmdir "$CLAUDE_DIR/$cat" 2>/dev/null || true
  done
else
  echo "ℹ No org agent/skill/hook source at $SRC — leaving committed .claude/ org items as-is."
  echo "  (Pass the upstream ai-docs/ path as arg 2, or run the sync, to refresh them.)"
fi

# ─── .gitignore reconciliation ───────────────────────────────────────────────
# We now COMMIT .claude/{agents,skills,hooks}. Strip the stale subtree-era ignore
# lines (which would otherwise prevent `git add .claude/` from staging them), and
# ensure only the runtime/session files stay ignored.
GITIGNORE="$ROOT/.gitignore"
touch "$GITIGNORE"
if grep -qE '^\.claude/(agents|skills|hooks)/?[[:space:]]*$' "$GITIGNORE" 2>/dev/null; then
  grep -vE '^\.claude/(agents|skills|hooks)/?[[:space:]]*$' "$GITIGNORE" > "$GITIGNORE.tmp" \
    && mv "$GITIGNORE.tmp" "$GITIGNORE"
fi
for entry in ".claude/settings.json" ".claude/show-docs-enabled" ".claude/current-read-log.txt"; do
  grep -qxF "$entry" "$GITIGNORE" 2>/dev/null || printf '%s\n' "$entry" >> "$GITIGNORE"
done

echo "✓ .claude/ rendered from .ai-docs/ (org agents/skills/hooks reconciled via .claude/.org-managed; project-local additions preserved; runtime files ignored)"
