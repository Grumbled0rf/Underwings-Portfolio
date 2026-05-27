#!/usr/bin/env bash
# daily-touchpoints.sh — Phase E customer-success reminders.
# Hits the pandoc-render sidecar /touchpoints endpoint, which finds Won
# deals at day 7/30/90 post-signature and posts reminders to
# #client-success. Run daily ~09:00 Asia/Dubai via systemd timer.
set -euo pipefail
REPO_DIR="/home/deployer/underwings"
TOKEN="$(grep -E '^PANDOC_RENDER_TOKEN=' "${REPO_DIR}/.env" | head -1 | cut -d= -f2-)"
cd "${REPO_DIR}"
docker compose exec -T pandoc-render \
  sh -c "curl -sS --max-time 30 -X POST -H 'X-Shared-Token: ${TOKEN}' http://127.0.0.1:3000/touchpoints"
echo
