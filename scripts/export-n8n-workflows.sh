#!/usr/bin/env bash
# export-n8n-workflows.sh
#
# Exports every workflow from the running n8n instance into
# /home/deployer/underwings/n8n/workflows/ as one JSON per workflow.
# Then diffs against git; if anything changed, the diff is logged so we
# notice drift between deployed-n8n and committed source.
#
# Does NOT auto-commit — drift should be reviewed before being absorbed
# (someone may have edited a workflow live as an emergency hotfix; we
# need to know).
#
# Usage:
#   ./export-n8n-workflows.sh           # full run
#   ./export-n8n-workflows.sh --quiet   # silent unless drift found
#
# Cron:
#   30 2 * * *  cd /home/deployer/underwings && ./scripts/export-n8n-workflows.sh --quiet
#
# Prerequisites:
#   - n8n CLI accessible via `docker compose exec n8n n8n export:workflow`
#   - git working tree assumed clean enough that `git diff` is meaningful
#
# Exits 0 on success (whether drift was found or not).
# Exits 1 if export failed (n8n unreachable, etc.).

set -euo pipefail

REPO_DIR="/home/deployer/underwings"
WORKFLOWS_DIR="${REPO_DIR}/n8n/workflows"
TMP_DIR="$(mktemp -d)"
QUIET=false
LOG="/tmp/n8n-export-$(date -u +%Y%m%d-%H%M).log"

trap 'rm -rf "${TMP_DIR}"' EXIT

if [[ "${1:-}" == "--quiet" ]]; then QUIET=true; fi

log()  { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "${LOG}"; }
loud() { if [[ "${QUIET}" == "false" ]]; then echo "$*"; fi; }

cd "${REPO_DIR}"

log "Exporting workflows from running n8n container…"
if ! docker compose exec -T n8n n8n export:workflow --all --output="/tmp/wf-export" >/dev/null 2>&1; then
  log "ERROR: n8n CLI export failed (container down? auth?)"
  exit 1
fi

# Copy export out of the container into TMP_DIR
docker compose cp n8n:/tmp/wf-export "${TMP_DIR}/" 2>>"${LOG}" || true
docker compose exec -T n8n sh -c 'rm -rf /tmp/wf-export' >/dev/null 2>&1 || true

# Normalise: one file per workflow. n8n exports as separate JSON files
# named after workflow.id when --output is a directory. Move them in.
if [[ ! -d "${TMP_DIR}/wf-export" ]]; then
  log "ERROR: export directory not found inside ${TMP_DIR}"
  exit 1
fi

# Compare against committed source
DRIFT_COUNT=0
for f in "${TMP_DIR}/wf-export"/*.json; do
  [[ -e "${f}" ]] || continue
  base="$(basename "${f}")"

  # n8n exports use workflow.id as filename. Our committed files are
  # numbered (01-…, 02-…). We diff by matching the `id` field inside.
  exported_id="$(python3 -c "import json; print(json.load(open('${f}')).get('id','?'))" 2>/dev/null || echo unknown)"

  # Find the matching source file by inspecting `id` of each
  source_match=""
  for src in "${WORKFLOWS_DIR}"/*.json; do
    [[ -e "${src}" ]] || continue
    src_id="$(python3 -c "import json; print(json.load(open('${src}')).get('id','?'))" 2>/dev/null || echo unknown)"
    if [[ "${src_id}" == "${exported_id}" ]]; then
      source_match="${src}"
      break
    fi
  done

  if [[ -z "${source_match}" ]]; then
    log "NEW workflow in n8n not in git: ${exported_id} (export filename: ${base})"
    DRIFT_COUNT=$((DRIFT_COUNT + 1))
    continue
  fi

  # Diff (normalise both sides by re-serialising sorted) to ignore key order
  python3 -c "
import json, sys
a = json.load(open('${source_match}'))
b = json.load(open('${f}'))
# Don't compare audit fields that change every export
for k in ('updatedAt', 'createdAt', 'versionId'):
    a.pop(k, None); b.pop(k, None)
sys.exit(0 if json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True) else 1)
" 2>/dev/null && continue

  log "DRIFT: workflow ${exported_id} (source: ${source_match}) differs from deployed"
  DRIFT_COUNT=$((DRIFT_COUNT + 1))
done

if [[ "${DRIFT_COUNT}" -gt 0 ]]; then
  loud ""
  loud "⚠️  ${DRIFT_COUNT} workflow(s) drifted between deployed n8n and git."
  loud "    Review log: ${LOG}"
  loud "    To absorb the drift: cp ${TMP_DIR}/wf-export/*.json ${WORKFLOWS_DIR}/ + git commit"
  loud ""
  # Optional: post to Slack #ops if SLACK_OPS_WEBHOOK is set
  if [[ -n "${SLACK_OPS_WEBHOOK:-}" ]]; then
    curl -sS -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"⚠️ n8n workflow drift detected: ${DRIFT_COUNT} workflow(s) differ from git. Log: ${LOG}\"}" \
      "${SLACK_OPS_WEBHOOK}" >/dev/null || true
  fi
else
  log "OK — all workflows match git."
fi

exit 0
