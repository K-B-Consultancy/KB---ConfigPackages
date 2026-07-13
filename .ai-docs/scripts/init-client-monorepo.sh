#!/usr/bin/env bash
# init-client-monorepo.sh
#
# Bootstraps a new KB Consultancy client monorepo:
#   - .ai-docs/ (flat layout) fetched from KB-Documentation — NO git subtree
#   - .claude/ generated and COMMITTED (agents, skills, hooks)
#   - root AGENTS.md / CLAUDE.md / README.md from templates
#   - npm workspace root (package.json + .npmrc) — apps under apps/<name>
#   - .github/ CI scaffolding
#
# Run ONCE from the root of a new (empty/near-empty) client repo, before adding apps.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/K-B-Consultancy/KB---Documentation/main/ai-docs/scripts/init-client-monorepo.sh | bash
#
# Or, from a local clone of KB-Documentation:
#   /path/to/KB-Documentation/ai-docs/scripts/init-client-monorepo.sh

set -euo pipefail

REPO_OWNER="K-B-Consultancy"
REPO_NAME="KB---Documentation"
BRANCH="main"
TARBALL_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/archive/refs/heads/${BRANCH}.tar.gz"

# ─── Sanity checks ───────────────────────────────────────────────────────────
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: not inside a git repository. Run: git init && git remote add origin <url>" >&2
  exit 1
fi
if [ "$(git rev-parse --show-toplevel)" != "$(pwd)" ]; then
  echo "Error: run from the repository root." >&2
  exit 1
fi
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Error: working tree has uncommitted changes. Commit or stash first." >&2
  exit 1
fi
if [ -d ".ai-docs" ] || [ -f "AGENTS.md" ]; then
  echo "Error: this repo already looks initialized (.ai-docs/ or AGENTS.md exists)." >&2
  echo "To UPDATE the docs, run .ai-docs/scripts/sync-docs.sh instead." >&2
  exit 1
fi

echo "→ Initializing client monorepo from ${REPO_NAME}…"
echo ""

# ─── Project questions ───────────────────────────────────────────────────────
read -r -p "Does this project deploy to production via GitHub Releases (enables Release Drafter)? [y/N] " REL_ANS
REL_ANS="$(printf '%s' "${REL_ANS:-}" | tr '[:upper:]' '[:lower:]')"
case "$REL_ANS" in y|yes) HAS_RELEASES=true ;; *) HAS_RELEASES=false ;; esac
echo ""

# ─── 1) Fetch ai-docs/ -> .ai-docs/ (flat, portable, no subtree) ─────────────
echo "[1/6] Fetching .ai-docs/ from ${REPO_NAME}@${BRANCH}…"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$TARBALL_URL" | tar -xz -C "$TMP"
EXTRACT_ROOT="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)"
if [ -z "$EXTRACT_ROOT" ] || [ ! -d "$EXTRACT_ROOT/ai-docs" ]; then
  echo "Error: could not locate ai-docs/ in the downloaded archive." >&2
  exit 1
fi
mkdir -p .ai-docs
cp -R "$EXTRACT_ROOT/ai-docs/." .ai-docs/
# agents/, skills/, and scripts/hooks/ are render-sources only — their committed home
# in a client is .claude/, not .ai-docs/. Drop them here so the layout matches what the
# CI sync produces (they're regenerated into .claude/ in the next step, along with any
# repo-local upstream skills such as audit-agent-docs). Keep the rest of scripts/ —
# clients invoke .ai-docs/scripts/... directly.
rm -rf .ai-docs/agents .ai-docs/skills .ai-docs/scripts/hooks
echo "  ✓ .ai-docs/ populated"

# ─── 2) Generate committed .claude/ ──────────────────────────────────────────
echo "[2/6] Generating .claude/ (agents, skills, hooks, settings)…"
# Read the agent/hook and client-facing skill sources from the extracted upstream
# ai-docs/ (arg 2), plus any repo-local upstream skills from the extracted .claude/,
# since they were just excluded from .ai-docs/ above.
#
# RENDER_SKIP must match the policy declared in ai-docs/sync-targets.yml
# (defaults.render_skip). Agents and hooks are render-sources only — they never get
# committed into a client's .claude/. Passing this here keeps init consistent with the
# recurring sync; without it, init would leak every org agent + hook into the new repo.
RENDER_SKIP="agents hooks" bash .ai-docs/scripts/lib/render-claude-dir.sh "$(pwd)" "$EXTRACT_ROOT/ai-docs"

# ─── 3) Root docs from templates ──────────────────────────────────────────────
echo "[3/6] Writing root AGENTS.md / CLAUDE.md / README.md…"
cp ".ai-docs/20-templates/ROOT_AGENTS.template.md"  "AGENTS.md"
cp ".ai-docs/20-templates/ROOT_README.template.md"  "README.md"
printf '@AGENTS.md\n' > "CLAUDE.md"   # Claude Code shim — it does not read AGENTS.md natively

# ─── 4) npm workspace root ───────────────────────────────────────────────────
echo "[4/6] Setting up npm workspace root…"
CLIENT_SLUG="$(basename "$(git rev-parse --show-toplevel)" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')"
if [ ! -f "package.json" ]; then
  sed "s/{{CLIENT_SLUG}}/${CLIENT_SLUG}/g" \
    ".ai-docs/20-templates/root-package.template.json" > "package.json"
fi
[ -f ".npmrc" ] || cp ".ai-docs/20-templates/.npmrc" ".npmrc"
echo "  ✓ package.json (workspaces: apps/*, packages/*) + .npmrc (exact pins)"
echo "  ℹ apps/api (Maven/Spring Boot) is NOT an npm workspace member — npm only"
echo "    picks up apps/* dirs that contain a package.json, so this is automatic."

# ─── 5) .github/ scaffolding (Copilot reads AGENTS.md natively — no symlink) ──
echo "[5/6] Copying .github/ workflows and config…"
mkdir -p ".github/workflows"
cp ".ai-docs/20-templates/.github/workflows/pr-checks.yml"            ".github/workflows/"
cp ".ai-docs/20-templates/.github/workflows/copilot-setup-steps.yml" ".github/workflows/"
cp ".ai-docs/20-templates/.github/workflows/dependabot-automerge.yml" ".github/workflows/"
cp ".ai-docs/20-templates/.github/dependabot.yml"                    ".github/"
cp ".ai-docs/20-templates/.github/pull_request_template.md"          ".github/"
if [ "$HAS_RELEASES" = true ]; then
  cp ".ai-docs/20-templates/.github/workflows/release-drafter.yml" ".github/workflows/"
  cp ".ai-docs/20-templates/.github/release-drafter.yml"           ".github/"
  echo "  ✓ Release Drafter included"
else
  echo "  ℹ Release Drafter skipped (no GitHub-Releases production flow — add later if needed)"
fi

# ─── 6) Root .gitignore ──────────────────────────────────────────────────────
echo "[6/6] Writing root .gitignore…"
if [ ! -f ".gitignore" ]; then
  cat > ".gitignore" <<'EOF'
# Dependencies (npm workspace hoists to the root)
node_modules/

# Build output
dist/
build/

# Env
.env
.env.local
.env.*.local

# OS
.DS_Store
EOF
fi
# .claude runtime/session files are added by render-claude-dir.sh

# ─── Done ────────────────────────────────────────────────────────────────────
cat <<EOF

✓ Client monorepo initialized.

─────────────────────────────────────────────────────────────────
MANUAL CHECKLIST — full version:
.ai-docs/20-templates/NEW_PROJECT_CHECKLIST.md
─────────────────────────────────────────────────────────────────

  [ ] 1. Fill in {{CLIENT_NAME}} and the apps table in AGENTS.md
  [ ] 2. Fill in the client overview + apps table in README.md
  [ ] 3. Create apps under apps/<name>/ — for each, add
         apps/<name>/AGENTS.md and apps/<name>/README.md from the
         templates in .ai-docs/20-templates/
  [ ] 4. Update .github/workflows/pr-checks.yml, copilot-setup-steps.yml,
         and .github/dependabot.yml to match your real app paths
  [ ] 5. Add this repo to ai-docs/sync-targets.yml in KB-Documentation
         and grant SYNC_DISPATCH_TOKEN access
  [ ] 6. Configure branch protection on main (see the checklist)

Commit when done:
  git add .
  git commit -m "chore: initialize KB Consultancy monorepo structure"
  git push
EOF
