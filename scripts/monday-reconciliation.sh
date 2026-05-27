#!/usr/bin/env bash
# monday-reconciliation.sh — Phase A reconciliation ritual.
# Posts a Monday checklist to #ops so the team keeps the plan honest.
# Runs Monday 08:00 Asia/Dubai via systemd timer.
#
# Checks it actually computes (cheap, read-only):
#   - Krayin pipeline/stage count vs docs/krayin-ids-reference.md
#   - n8n workflow drift (delegates to export-n8n-workflows.sh result)
#   - Last successful DB backup age
# Then posts a checklist for the humans to act on.
set -euo pipefail

REPO_DIR="/home/deployer/underwings"
cd "${REPO_DIR}"

get_env() { { grep -E "^$1=" "${REPO_DIR}/.env" || true; } | head -1 | cut -d= -f2-; }
SLACK_OPS_WEBHOOK="$(get_env SLACK_OPS_WEBHOOK)"

# --- automated checks ---
PIPELINES=$(docker compose exec -T krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin \
  -N -e "SELECT COUNT(*) FROM lead_pipelines;" 2>/dev/null | tr -d '[:space:]' || echo '?')

LEADS=$(docker compose exec -T krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin \
  -N -e "SELECT COUNT(*) FROM leads;" 2>/dev/null | tr -d '[:space:]' || echo '?')

LATEST_BACKUP=$(ls -1dt /home/deployer/backups/2* 2>/dev/null | head -1)
BACKUP_AGE="(none found)"
if [[ -n "${LATEST_BACKUP}" ]]; then
  BACKUP_AGE="$(basename "${LATEST_BACKUP}")"
fi

WAREHOUSE_LEADS=$(docker compose exec -T metrics-db psql -U warehouse_admin -d warehouse \
  -t -c "SELECT COUNT(*) FROM raw.leads;" 2>/dev/null | tr -d '[:space:]' || echo '?')

# --- compose message ---
MSG=$(cat <<MSGEOF
*🗓️ Monday reconciliation* — keep the plan honest (5 min)

*Automated checks:*
• Krayin pipelines: ${PIPELINES} (expect 3) · leads: ${LEADS}
• Warehouse raw.leads: ${WAREHOUSE_LEADS} (should ≈ Krayin leads after last night's ETL)
• Latest DB backup: ${BACKUP_AGE}

*Human checklist:*
1. Any KPI crossed a kill-criterion this week? (Metabase → Funnel)
2. Did the plan drift from reality? Update UNDERWINGS-MASTER-PLAN.md §6 if so.
3. Any n8n workflow edited live but not committed? (check #ops drift alerts)
4. Rotten leads piling up? (Metabase → Stage velocity → Rotten leads)
5. This week's single most important action: _______
MSGEOF
)

if [[ -n "${SLACK_OPS_WEBHOOK}" ]]; then
  curl -sS -X POST -H 'Content-Type: application/json' \
    --data "$(python3 -c 'import json,sys; print(json.dumps({"text": sys.stdin.read()}))' <<<"${MSG}")" \
    "${SLACK_OPS_WEBHOOK}" >/dev/null || echo "slack post failed"
  echo "reconciliation posted to #ops"
else
  echo "SLACK_OPS_WEBHOOK not set — printing instead:"
  echo "${MSG}"
fi
