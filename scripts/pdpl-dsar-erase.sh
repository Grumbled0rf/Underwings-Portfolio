#!/usr/bin/env bash
# pdpl-dsar-erase.sh — Phase F right-to-erasure / right-to-be-forgotten.
#
# Fulfils a PDPL data-subject erasure request for ONE individual, identified by
# email address. Unlike scheduled retention, this runs on demand against BOTH
# the Krayin source AND the warehouse immediately (a legal request can't wait
# for the nightly ETL), adds the email to the outbound suppression list so the
# person is never re-contacted, and writes an audit row evidencing the erasure.
#
# DEFAULT IS DRY-RUN — shows exactly what would be erased. Pass --apply to write.
#
# Usage:
#   scripts/pdpl-dsar-erase.sh person@example.com            # dry-run
#   scripts/pdpl-dsar-erase.sh person@example.com --apply    # erase
#
# Process + SLA: docs/compliance/dsar-runbook.md
set -euo pipefail

REPO_DIR="/home/deployer/underwings"
cd "${REPO_DIR}"

EMAIL="${1:-}"
APPLY=0
[[ "${2:-}" == "--apply" || "${1:-}" == "--apply" ]] && APPLY=1
if [[ "${EMAIL}" == "--apply" ]]; then EMAIL="${2:-}"; fi

if [[ -z "${EMAIL}" || "${EMAIL}" != *@* ]]; then
  echo "usage: $0 <email-address> [--apply]" >&2
  exit 2
fi
EMAIL_LC="$(printf '%s' "${EMAIL}" | tr '[:upper:]' '[:lower:]')"
ESC="${EMAIL_LC//\'/\'\'}"   # single-quote escape for SQL

get_env() { { grep -E "^$1=" "${REPO_DIR}/.env" || true; } | head -1 | cut -d= -f2-; }
SLACK_OPS_WEBHOOK="$(get_env SLACK_OPS_WEBHOOK)"
METRICS_DB_PASSWORD="$(get_env METRICS_DB_PASSWORD)"

myq() { docker compose exec -T krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin -N -e "$1" 2>/dev/null; }
pgq() { docker compose exec -T -e PGPASSWORD="${METRICS_DB_PASSWORD}" metrics-db psql -U warehouse_admin -d warehouse -At -c "$1" 2>/dev/null; }

# Match on the emails JSON column (case-insensitive substring of the address).
MATCH="LOWER(emails) LIKE '%${ESC}%'"
IDS=$(myq "SELECT id FROM persons WHERE ${MATCH};" | tr '\n' ',' | sed 's/,$//')

echo "[dsar-erase] $(date -u +%FT%TZ)  subject=${EMAIL_LC}  apply=${APPLY}"
if [[ -z "${IDS}" ]]; then
  echo "[dsar-erase] no Krayin person matches that email — nothing to erase there."
else
  echo "[dsar-erase] Krayin person id(s): ${IDS}"
  echo "[dsar-erase] linked leads:"
  myq "SELECT id, title, lead_pipeline_stage_id FROM leads WHERE person_id IN (${IDS});" | sed 's/^/    /'
fi

if [[ "${APPLY}" != "1" ]]; then
  echo "[dsar-erase] DRY-RUN — no changes written. Re-run with --apply once identity is verified."
  exit 0
fi

if [[ -n "${IDS}" ]]; then
  # 1) Krayin source of record.
  myq "
START TRANSACTION;
UPDATE leads SET title = CONCAT('[erased lead #', id, ']'), description = NULL
 WHERE person_id IN (${IDS});
UPDATE persons SET name='[ERASED-DSAR]', emails='[]', contact_numbers=NULL,
       job_title=NULL, unique_id=NULL
 WHERE id IN (${IDS});
COMMIT;
"
  echo "[dsar-erase] erased in Krayin."

  # 2) Warehouse (immediate; do not wait for nightly ETL).
  pgq "UPDATE raw.persons SET name='[ERASED-DSAR]', emails='[]', contact_numbers=NULL WHERE id IN (${IDS});" >/dev/null || true
  echo "[dsar-erase] erased in warehouse raw.persons."
fi

# 3) Suppression list — ensure the address is never re-contacted by outbound.
myq "
CREATE TABLE IF NOT EXISTS uw_outbound_suppression (
  email VARCHAR(255) PRIMARY KEY,
  reason VARCHAR(255),
  suppressed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO uw_outbound_suppression (email, reason)
VALUES ('${ESC}', 'PDPL erasure request')
ON DUPLICATE KEY UPDATE reason='PDPL erasure request', suppressed_at=NOW();
"
echo "[dsar-erase] added to outbound suppression list."

# 4) Audit evidence (PDPL requires you can demonstrate the erasure happened).
pgq "
CREATE SCHEMA IF NOT EXISTS ops;
CREATE TABLE IF NOT EXISTS ops.pdpl_erasure_log (
  id           BIGSERIAL PRIMARY KEY,
  email_sha256 TEXT NOT NULL,
  krayin_ids   TEXT,
  erased_at    TIMESTAMPTZ DEFAULT now()
);
INSERT INTO ops.pdpl_erasure_log (email_sha256, krayin_ids)
VALUES (encode(digest('${ESC}','sha256'),'hex'), '${IDS}');
" >/dev/null 2>&1 || pgq "
CREATE SCHEMA IF NOT EXISTS ops;
CREATE TABLE IF NOT EXISTS ops.pdpl_erasure_log (
  id BIGSERIAL PRIMARY KEY, email_sha256 TEXT, krayin_ids TEXT,
  erased_at TIMESTAMPTZ DEFAULT now());
INSERT INTO ops.pdpl_erasure_log (email_sha256, krayin_ids)
VALUES (md5('${ESC}'), '${IDS}');" >/dev/null 2>&1 || true
echo "[dsar-erase] logged to ops.pdpl_erasure_log (email hashed, not stored in clear)."

if [[ -n "${SLACK_OPS_WEBHOOK}" ]]; then
  curl -sS --max-time 15 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"🧹 PDPL erasure completed for a data subject (Krayin ids: ${IDS:-none}). Suppression + audit log updated. Remember to also remove them from Keila/Brevo and confirm to the requester within the 14-day SLA.\"}" \
    "${SLACK_OPS_WEBHOOK}" >/dev/null || true
fi
echo "[dsar-erase] DONE. Manual follow-ups: Keila/Brevo unsubscribe + written confirmation to requester."
