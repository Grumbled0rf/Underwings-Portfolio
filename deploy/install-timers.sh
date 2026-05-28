#!/usr/bin/env bash
# install-timers.sh
#
# Installs the Phase G systemd timers + services into /etc/systemd/system.
# Idempotent — safe to re-run after edits.
#
# Requires sudo. Run once after pulling the Phase G commit.
#
#   sudo bash /home/deployer/underwings/deploy/install-timers.sh
#
# After install:
#   sudo systemctl status backup-databases.timer n8n-workflow-export.timer
#   journalctl -u backup-databases.service -f
#   sudo systemctl list-timers --all | grep -E 'backup-databases|n8n-workflow'

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="/etc/systemd/system"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Re-running under sudo…"
  exec sudo bash "$0" "$@"
fi

UNITS=(
  backup-databases.service
  backup-databases.timer
  n8n-workflow-export.service
  n8n-workflow-export.timer
  daily-touchpoints.service
  daily-touchpoints.timer
  monday-reconciliation.service
  monday-reconciliation.timer
  pdpl-retention.service
  pdpl-retention.timer
  outbound-warehouse-sync.service
  outbound-warehouse-sync.timer
)

for u in "${UNITS[@]}"; do
  echo "Installing ${u}…"
  install -m 644 "${SRC_DIR}/${u}" "${DEST_DIR}/${u}"
done

systemctl daemon-reload

for u in backup-databases.timer n8n-workflow-export.timer daily-touchpoints.timer monday-reconciliation.timer pdpl-retention.timer outbound-warehouse-sync.timer; do
  systemctl enable --now "${u}"
done

echo
echo "Installed and enabled. Status:"
systemctl list-timers --all | grep -E 'backup-databases|n8n-workflow|daily-touchpoints|monday-reconciliation|pdpl-retention' || true
echo
echo "Tail logs with:"
echo "  journalctl -u backup-databases.service -f"
echo "  journalctl -u n8n-workflow-export.service -f"
