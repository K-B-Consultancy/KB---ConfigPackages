#!/usr/bin/env bash
# Pipeline contract guard — CI enforcement of the plan → execute → validate
# handoff contracts on a pipeline PR. The contracts themselves are specified in
# the skills (rendered to .claude/skills/{plan,execute,validate}/ in client
# repos); this script only re-checks them mechanically:
#   plan     — status: complete, mandated sections, non-empty ### Test plan
#   execute  — every planned `#### Commit message` appears on the branch
#              (substring match, order not checked; a message already on the
#              base branch passes — that's a post-merge plan touch-up PR)
#   validate — the PR body carries the requirement-walkthrough table, or the
#              scripts-only sentinel for API-only changes
#
# Deviations: if docs/session-handoff.md on the branch records a deviation
# (execute skill § Deviations), a missing planned commit is a WARN, not a FAIL
# — the human reviewer checks the recorded deviation instead.
#
# Skipped entirely when docs/plan.md is not in the diff, or is deleted by it.
# This file is the single home of this check logic — the eval-pipeline golden
# tasks invoke it rather than restating it.
#
# Usage: check-pipeline-contracts.sh <base-ref> [pr-body-file]
set -euo pipefail

BASE="${1:?usage: check-pipeline-contracts.sh <base-ref> [pr-body-file]}"
BODY_FILE="${2:-}"
PLAN=docs/plan.md
fail=0
err()  { echo "FAIL  $1"; fail=1; }
warn() { echo "WARN  $1"; }
ok()   { echo "ok    $1"; }

if ! git diff --name-only "$BASE"...HEAD | grep -qxF "$PLAN"; then
  echo "docs/plan.md unchanged — not a pipeline PR, contract guard skipped."
  exit 0
fi
if git diff --diff-filter=D --name-only "$BASE"...HEAD | grep -qxF "$PLAN"; then
  echo "docs/plan.md is deleted by this PR — contract guard skipped."
  exit 0
fi

# ── plan contract ────────────────────────────────────────────────────────────
head -5 "$PLAN" | grep -q 'status: complete' \
  && ok "plan: status is complete" \
  || err "plan: a PR was opened from a plan not marked 'status: complete'"

grep -q '^## Requirements' "$PLAN" \
  && ok "plan: '## Requirements' present" \
  || err "plan: missing '## Requirements' section"

grep -q '^## Technical implementation' "$PLAN" \
  && ok "plan: '## Technical implementation' present" \
  || err "plan: missing '## Technical implementation' section"

rows=$(awk '/^### Test plan/{f=1; next} f && /^### /{exit} f' "$PLAN" | grep -cE '^\|' || true)
if [ "$rows" -ge 3 ]; then
  ok "plan: '### Test plan' has $((rows - 2)) row(s)"
else
  err "plan: '### Test plan' table has no data rows"
fi

# ── execute contract ─────────────────────────────────────────────────────────
deviated=0
if [ -f docs/session-handoff.md ] && awk '/Deviations/{f=1; next} f && /^##/{exit} f' docs/session-handoff.md | grep -viq 'none'; then
  deviated=1
fi
branch_log=$(git log --format=%s "$BASE"..HEAD)
base_log=$(git log --format=%s -n 500 "$BASE")
found_any=0
while IFS= read -r msg; do
  [ -n "$msg" ] || continue
  found_any=1
  if printf '%s\n' "$branch_log" | grep -qF "$msg"; then
    ok "execute: phase commit present — $msg"
  elif printf '%s\n' "$base_log" | grep -qF "$msg"; then
    ok "execute: phase commit already on base (post-merge plan edit) — $msg"
  elif [ "$deviated" -eq 1 ]; then
    warn "execute: phase commit missing but docs/session-handoff.md records a deviation — reviewer must verify: $msg"
  else
    err "execute: phase commit missing on branch — $msg"
  fi
done < <(awk '/^#### Commit message/ { if (getline <= 0) next; while ($0 ~ /^[[:space:]]*$/) { if (getline <= 0) next } gsub(/`/, ""); print }' "$PLAN")
[ "$found_any" -eq 1 ] || err "plan: no '#### Commit message' entries found — phases are unplanned or malformed"

# ── validate contract ────────────────────────────────────────────────────────
if [ -n "$BODY_FILE" ] && [ -f "$BODY_FILE" ]; then
  if grep -qF 'Verification: scripts-only (no web UI walkthrough)' "$BODY_FILE"; then
    ok "validate: scripts-only verification declared (API-only change)"
  else
    body_rows=$(grep -A50 '| Requirement |' "$BODY_FILE" | grep -cE '^\|' || true)
    if [ "$body_rows" -ge 3 ]; then
      ok "validate: walkthrough table has $((body_rows - 2)) row(s)"
    else
      err "validate: PR body has neither a walkthrough table with data rows nor the scripts-only sentinel"
    fi
  fi
else
  echo "note: no PR body file provided — walkthrough-table check skipped"
fi

exit "$fail"
