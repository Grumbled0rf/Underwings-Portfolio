#!/usr/bin/env bash
# Dump Krayin IDs to docs/krayin-ids-reference.md
# Re-run after any pipeline/source/type/user/attribute change in the Krayin UI.

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-underwings-krayin-db}"
DB_USER="${DB_USER:-krayin}"
DB_PASS="${DB_PASS:-KrCrmUnderwings2026x}"
DB_NAME="${DB_NAME:-krayin}"

q() {
  docker exec "$DB_CONTAINER" mariadb -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" \
    --batch --skip-column-names -e "$1" 2>/dev/null
}

echo "=== Pipelines ==="
q "SELECT id, name, rotten_days FROM lead_pipelines ORDER BY id;"

echo
echo "=== Stages ==="
q "SELECT id, lead_pipeline_id, name, probability, sort_order
   FROM lead_pipeline_stages ORDER BY lead_pipeline_id, sort_order;"

echo
echo "=== Sources ==="
q "SELECT id, name FROM lead_sources ORDER BY id;"

echo
echo "=== Types ==="
q "SELECT id, name FROM lead_types ORDER BY id;"

echo
echo "=== Users ==="
q "SELECT u.id, u.name, u.email, r.name AS role
   FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.id;"

echo
echo "=== Custom attributes (on leads) ==="
q "SELECT a.id, a.code, a.name, a.type,
          IFNULL(GROUP_CONCAT(ao.name ORDER BY ao.sort_order SEPARATOR ', '), '') AS options
   FROM attributes a
   LEFT JOIN attribute_options ao ON ao.attribute_id=a.id
   WHERE a.entity_type='leads' AND a.is_user_defined=1
   GROUP BY a.id ORDER BY a.id;"
