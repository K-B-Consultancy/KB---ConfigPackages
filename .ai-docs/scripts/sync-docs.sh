#!/usr/bin/env bash
# sync-docs.sh — manual local pull of the latest .ai-docs/ + .claude/ from KB-Documentation.
#
# The authoritative path is the automatic sync: every push to KB-Documentation's main
# opens a `chore/sync-ai-docs` PR in this repo (see .github/workflows/sync-to-clients.yml
# in KB-Documentation). This script is the convenience escape hatch — pull the latest now,
# locally, without waiting for the PR. It reproduces what CI does for THIS repo:
#
#   1. Mirror upstream ai-docs/ -> .ai-docs/ (flat), applying the default + this-repo
#      excludes declared in upstream ai-docs/sync-targets.yml.
#   2. Regenerate the committed .claude/ via render-claude-dir.sh, honoring the upstream
#      defaults.render_skip (agents + hooks stay render-sources, never committed here).
#
# It does NOT commit — it leaves the working tree dirty for you to review and commit.
#
# Run from the root of a client repo that was initialized with init-client-monorepo.sh.
#
# Usage:
#   ./.ai-docs/scripts/sync-docs.sh

set -euo pipefail

REPO_OWNER="K-B-Consultancy"
REPO_NAME="KB---Documentation"
BRANCH="main"
TARBALL_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz"

# ─── Sanity checks ───────────────────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: not inside a git repository." >&2
  exit 1
fi
ROOT="$(git rev-parse --show-toplevel)"
if [ "$ROOT" != "$(pwd)" ]; then
  echo "Error: run from the repository root ($ROOT)." >&2
  exit 1
fi
if [ ! -d ".ai-docs" ]; then
  echo "Error: no .ai-docs/ here. Initialize first with init-client-monorepo.sh." >&2
  exit 1
fi
for bin in curl tar rsync; do
  command -v "$bin" > /dev/null 2>&1 || { echo "Error: '$bin' is required but not installed." >&2; exit 1; }
done

# ─── 1) Fetch upstream ai-docs/ ──────────────────────────────────────────────
# Resolve the SHA first, then download that exact commit's tarball — so the
# SYNC_INFO stamp can never claim a commit other than the content pulled.
UPSTREAM_SHA="$(git ls-remote "https://github.com/${REPO_OWNER}/${REPO_NAME}.git" "refs/heads/${BRANCH}" | cut -f1)"
if [ -n "$UPSTREAM_SHA" ]; then
  TARBALL_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/${UPSTREAM_SHA}.tar.gz"
fi
echo "→ Pulling .ai-docs/ + .claude/ from ${REPO_NAME}@${UPSTREAM_SHA:-$BRANCH}…"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP"
EXTRACT_ROOT="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)"
if [ -z "$EXTRACT_ROOT" ] || [ ! -d "$EXTRACT_ROOT/ai-docs" ]; then
  echo "Error: could not locate ai-docs/ in the downloaded archive." >&2
  exit 1
fi
MANIFEST="$EXTRACT_ROOT/ai-docs/sync-targets.yml"

# ─── 2) Resolve excludes + render_skip from the upstream manifest ────────────
# Policy lives in one place: sync-targets.yml. We read the default excludes, the
# render_skip categories, and this repo's per-repo excludes (matched by origin slug)
# so a local pull produces the same result as the CI sync. yq is preferred; if it is
# not installed we fall back to the documented defaults (agents/skills/hooks render
# sources + internal files) so the common case still works offline.
SLUG=""
if origin_url="$(git remote get-url origin 2>/dev/null)"; then
  SLUG="$(printf '%s' "$origin_url" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
fi

EXCLUDE_ARGS=()
RENDER_SKIP=""
if command -v yq > /dev/null 2>&1; then
  while IFS= read -r pat; do
    [ -n "$pat" ] && EXCLUDE_ARGS+=(--exclude="$pat")
  done < <(yq e '.defaults.exclude[]' "$MANIFEST" 2>/dev/null || true)
  if [ -n "$SLUG" ]; then
    while IFS= read -r pat; do
      [ -n "$pat" ] && EXCLUDE_ARGS+=(--exclude="$pat")
    done < <(yq e ".repositories[] | select((.repo // .) == \"$SLUG\") | .exclude[]?" "$MANIFEST" 2>/dev/null || true)
  fi
  RENDER_SKIP="$(yq e '.defaults.render_skip // [] | join(" ")' "$MANIFEST" 2>/dev/null || echo "")"
else
  echo "  ℹ yq not found — using default excludes (per-repo overrides from sync-targets.yml are skipped)."
  echo "    Install yq for an exact match with the CI sync, or just merge the automatic PR instead."
  for pat in /sync-targets.yml /agents /skills /scripts/hooks .DS_Store; do
    EXCLUDE_ARGS+=(--exclude="$pat")
  done
  RENDER_SKIP="agents hooks"
fi

# ─── 3) Mirror ai-docs/ -> .ai-docs/ and regenerate .claude/ ─────────────────
rsync -a --delete --delete-excluded "${EXCLUDE_ARGS[@]}" "$EXTRACT_ROOT/ai-docs/" .ai-docs/
RENDER_SKIP="$RENDER_SKIP" bash .ai-docs/scripts/lib/render-claude-dir.sh "$ROOT" "$EXTRACT_ROOT/ai-docs"

# Stamp the sync source (same file CI writes) so freshness stays answerable.
printf 'source_repo: %s/%s\nsource_commit: %s\nsynced_at: %s\n' \
  "$REPO_OWNER" "$REPO_NAME" "${UPSTREAM_SHA:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .ai-docs/SYNC_INFO

# ─── Done ────────────────────────────────────────────────────────────────────
# SYNC_INFO always differs (fresh timestamp) — exclude it from change detection,
# and roll it back when it is the only change.
if git diff --quiet -- .ai-docs/ .claude/ .gitignore ':(exclude).ai-docs/SYNC_INFO' \
   && git diff --cached --quiet -- .ai-docs/ .claude/ .gitignore ':(exclude).ai-docs/SYNC_INFO'; then
  git checkout -q -- .ai-docs/SYNC_INFO 2>/dev/null || rm -f .ai-docs/SYNC_INFO
  echo "✓ Already up to date — nothing changed."
else
  echo ""
  echo "✓ .ai-docs/ + .claude/ updated. Review the diff, then commit:"
  echo "    git add .ai-docs/ .claude/ .gitignore"
  echo "    git commit -m \"chore: sync .ai-docs + .claude from KB-Documentation\""
fi
