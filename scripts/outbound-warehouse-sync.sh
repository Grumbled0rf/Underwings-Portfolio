#!/usr/bin/env bash
# outbound-warehouse-sync.sh — land the outbound tables into the warehouse for
# Metabase KPIs (PII-minimised). Hits the pandoc-render sidecar. Runs nightly
# ~02:45 Asia/Dubai via systemd timer (after the main Krayin→warehouse ETL).
set -euo pipefail
REPO_DIR="/home/deployer/underwings"
TOKEN="$(grep -E '^PANDOC_RENDER_TOKEN=' "${REPO_DIR}/.env" | head -1 | cut -d= -f2-)"
cd "${REPO_DIR}"
docker compose exec -T pandoc-render \
  sh -c "curl -sS --max-time 60 -X POST -H 'X-Shared-Token: ${TOKEN}' http://127.0.0.1:3000/outbound/warehouse-sync"
echo
