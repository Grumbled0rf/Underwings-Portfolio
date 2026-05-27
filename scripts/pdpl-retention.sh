#!/usr/bin/env bash
# pdpl-retention.sh — Phase F PDPL data-retention enforcement.
#
# Anonymises personal data in Krayin once it passes the retention window
# defined in docs/compliance/data-retention-policy.md:
#   - Pure outbound prospects (no inbound engagement): 12 months from last activity
#   - Inbound enquiries (and mixed):                    24 months from last activity
#   - Clients (any Won lead):                           NEVER auto-anonymised here
#                                                       (7-yr post-engagement rule is manual)
#
# Anonymisation redacts the person (name/emails/phone/job title) and the lead
# free-text (title/description) but KEEPS de-identified deal facts (stage, value,
# dates, source) so the analytics warehouse stays intact. The nightly Krayin→
# warehouse ETL (n8n workflow 13) re-syncs raw.persons afterwards, so the
# warehouse self-heals — this script only needs to touch the source of record.
#
# DEFAULT IS DRY-RUN. Pass --apply to actually write. Runs weekly via systemd
# timer (deploy/pdpl-retention.timer), which calls it with --apply.
set -euo pipefail

REPO_DIR="/home/deployer/underwings"
cd "${REPO_DIR}"

APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

get_env() { { grep -E "^$1=" "${REPO_DIR}/.env" || true; } | head -1 | cut -d= -f2-; }
SLACK_OPS_WEBHOOK="$(get_env SLACK_OPS_WEBHOOK)"

myq() {
  docker compose exec -T krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin -N -e "$1" 2>/dev/null
}

# Stage IDs that mark a paying client (P4/P5/P6 "Won"); sources that are outbound.
WON_STAGES="20,29,37"
OUTBOUND_SOURCES="11,12,13,14,15,16,17,35"

# CTE picking person IDs that are past their retention window and are NOT clients.
# has_inbound = the person has at least one non-outbound lead → 24-month window.
ELIGIBLE_CTE="
WITH person_leads AS (
  SELECT p.id AS person_id,
         MAX(l.updated_at) AS last_activity,
         MAX(l.lead_pipeline_stage_id IN (${WON_STAGES})) AS is_client,
         MAX(l.lead_source_id NOT IN (${OUTBOUND_SOURCES})) AS has_inbound
  FROM persons p
  JOIN leads l ON l.person_id = p.id
  WHERE p.name <> '[ANONYMISED]'
  GROUP BY p.id
)
SELECT person_id FROM person_leads
WHERE is_client = 0
  AND ( last_activity < (NOW() - INTERVAL 24 MONTH)
        OR (has_inbound = 0 AND last_activity < (NOW() - INTERVAL 12 MONTH)) )
"

COUNT=$(myq "SELECT COUNT(*) FROM ( ${ELIGIBLE_CTE} ) z;" | tr -d '[:space:]' || echo '?')
COUNT=${COUNT:-0}

echo "[pdpl-retention] $(date -u +%FT%TZ)  eligible_for_anonymisation=${COUNT}  apply=${APPLY}"

if [[ "${APPLY}" != "1" ]]; then
  echo "[pdpl-retention] DRY-RUN — no changes written. Re-run with --apply to enforce."
  exit 0
fi

if [[ "${COUNT}" == "0" || "${COUNT}" == "?" ]]; then
  echo "[pdpl-retention] nothing to anonymise."
  exit 0
fi

# Apply inside a single transaction. Person redaction first, then lead free-text,
# then any organization whose every person is now anonymised.
myq "
START TRANSACTION;
CREATE TEMPORARY TABLE _expired AS ${ELIGIBLE_CTE};

UPDATE leads
   SET title = CONCAT('[anonymised lead #', id, ']'), description = NULL
 WHERE person_id IN (SELECT person_id FROM _expired);

UPDATE persons
   SET name = '[ANONYMISED]', emails = '[]', contact_numbers = NULL,
       job_title = NULL, unique_id = NULL
 WHERE id IN (SELECT person_id FROM _expired);

UPDATE organizations o
   SET o.name = '[ANONYMISED]', o.address = NULL
 WHERE o.id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM persons p
      WHERE p.organization_id = o.id AND p.name <> '[ANONYMISED]'
   )
   AND EXISTS (
     SELECT 1 FROM persons p WHERE p.organization_id = o.id
   );

COMMIT;
"

echo "[pdpl-retention] anonymised ${COUNT} data subject(s) in Krayin. Warehouse will re-sync on the next nightly ETL."

if [[ -n "${SLACK_OPS_WEBHOOK}" ]]; then
  curl -sS --max-time 15 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"🗂️ PDPL retention: anonymised *${COUNT}* expired non-client data subject(s) in Krayin per the retention policy. Warehouse re-syncs tonight.\"}" \
    "${SLACK_OPS_WEBHOOK}" >/dev/null || true
fi
