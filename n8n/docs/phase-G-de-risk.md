# Phase G — De-risk infrastructure

> **Status:** Code shipped + first backup successfully ran 2026-05-21.
> **Plan reference:** `UNDERWINGS-MASTER-PLAN.md` §7/G
> **RTO target:** 4 hours per service. **RPO target:** 24 hours.

## What was built

### Nightly database backup pipeline
- **`scripts/backup-databases.sh`** — pg_dump + mariadb-dump for 8 databases
  across 6 containers; piped through gzip → gpg AES-256 symmetric → disk.
- **`/home/deployer/backups/YYYY-MM-DD/`** — daily backup directory with
  manifest + sha256 sums + run log.
- **14-day local retention.** Older directories auto-purged at end of run.
- **First run validated 2026-05-21:** 8 databases, 1.8 MB total, 5 seconds
  end-to-end, decryption round-trip verified.

### Backup contents (per nightly run)
| Container | Database | Today's size (encrypted) |
|---|---|---|
| `underwings-db` (Supabase) | `postgres` | ~3 KB |
| `underwings-db` (Supabase) | `underwings` | ~45 KB |
| `underwings-calcom-db` | `calcom` | ~627 KB |
| `underwings-documenso-db` | `documenso` | ~29 KB |
| `underwings-metrics-db` | `warehouse` | ~3 KB (empty) |
| `underwings-metrics-db` | `metabase` | ~81 KB |
| `underwings-n8n-db` | `n8n` | ~930 KB |
| `underwings-krayin-db` | `krayin` | ~32 KB |

### Workflow drift detection
- **`scripts/export-n8n-workflows.sh`** — nightly export of every workflow
  from the running n8n instance via the n8n CLI; diffs each against the
  committed source in `n8n/workflows/`; logs drift (does NOT auto-commit
  — drift could be a hotfix or could be a mistake; humans review).
- Slack `#ops` alert when drift is found (if `SLACK_OPS_WEBHOOK` is set).

### Systemd timers
- `deploy/backup-databases.{service,timer}` — fires daily at 02:30
  Asia/Dubai with up to 2 min jitter and `Persistent=true` (catches missed
  runs after a reboot).
- `deploy/n8n-workflow-export.{service,timer}` — fires daily at 02:00
  Asia/Dubai, same persistence guarantees.
- `deploy/install-timers.sh` — one-shot install script. Run once with
  sudo to drop the units into `/etc/systemd/system/` and enable them.

**Founder action remaining:** `sudo bash /home/deployer/underwings/deploy/install-timers.sh`
(2 commands; idempotent; ~10 seconds).

### Incident response runbooks
- `runbooks/n8n-is-down.md` — P1, ≤ 4h target. Triage tree, mitigation,
  restore from backup, manual webhook fallback during outage.
- `runbooks/krayin-is-down.md` — P0, ≤ 2h target. Includes the
  `fix-krayin.sh` recovery step that catches the most common cause.
- `runbooks/documenso-is-down.md` — P2, ≤ 8h target. Manual signature
  fallback while down (rendered PDFs survive in pandoc-render's /tmp).
- `runbooks/claude-api-down.md` — P2, ≤ 4h target. Cost-spike + outage
  + quota cases. References the cost guards already in place.
- `runbooks/domain-blacklisted.md` — P1, ≥ 7 days. Reputation repair is
  slow; emphasises stopping outbound immediately + warming a subdomain
  rather than rotating providers.

## Threat model

| Risk | Mitigation | Status |
|---|---|---|
| Disk failure on VPS | Daily encrypted local backup | ✅ |
| Wrong rm -rf inside a container | Same backup | ✅ |
| Krayin schema upgrade breaks things | Backup → restore + roll image back | ✅ |
| Token / secret leaked | `.env` is gitignored; passphrase rotates on demand | ✅ |
| Backup files leaked (someone gets `/home/deployer/backups/`) | AES-256 gpg + ≥ 64 char passphrase | ✅ at rest |
| Backup files corrupted | sha256 manifests per run; weekly restore drill | 🟡 manifest yes, drill — manual |
| Whole VPS lost (host vanishes) | **NO OFFSITE YET** — see follow-up | ❌ |
| Cloudflare account compromise | Tunnel + Access logs in CF dashboard | 🟡 logged, not yet alerting |
| Anthropic API key leak | Per-call cost log; daily AED 100 alert | ✅ |
| n8n workflow tampering | Nightly drift detection + git | ✅ |

## RTO / RPO targets

| Service | RTO | RPO |
|---|---|---|
| Frontend (website) | 30 min — image only | 0 (stateless) |
| Nginx | 10 min — config in git | 0 (stateless) |
| Krayin (lead pipeline) | 2 hr | 24 hr |
| n8n (workflow orchestration) | 4 hr | 24 hr |
| Documenso (signed contracts) | 8 hr | 24 hr |
| Metabase / metrics-db | 24 hr (low priority) | 24 hr |
| Cal.com | 8 hr | 24 hr |
| Plane (delivery PM) | 8 hr (no compose entry yet) | n/a |

## What's deliberately NOT in Phase G

- **S3 / object-storage offsite.** Local backups only. Highest-impact
  follow-up: add `rclone copy` to Hetzner Object Storage / Backblaze B2
  at the end of `backup-databases.sh`. ~30 min of work once you have a
  bucket + credentials. Captured as Phase G follow-up below.
- **Read-replica for any DB.** Backups + 24h RPO is sufficient at this
  stage. Revisit when there's a single client whose data loss > 1 hour
  is unacceptable.
- **Active-active or HA n8n.** Single instance is fine for now. Revisit
  when daily-execution-count > 5,000.
- **Quarterly fire drill.** Plan §7/G mentions it; not yet scheduled.
  Add to Phase A reconciliation ritual once Slack workspace exists.

## Phase G follow-ups (small, do later)

1. **Offsite backup target.** Once you pick Hetzner Object Storage or
   Backblaze B2:
   ```bash
   # add to end of backup-databases.sh:
   rclone copy "${OUT_DIR}" "remote:underwings-backups/$(date +%Y-%m-%d)" --transfers=4
   ```
   Configure `rclone` credentials at `/home/deployer/.config/rclone/rclone.conf` (chmod 600).
   ~30 min including bucket setup.

2. **Uptime Kuma probes** for new services. Add HTTP checks for:
   - `https://metrics.underwings.org/api/health` (Metabase)
   - `https://sign.underwings.org/api/health` (Documenso)
   - `http://pandoc-render:3000/health` (sidecar, internal)
   Use the existing `crm.underwings.org` and `n8n.underwings.org` probes as
   templates. ~10 min.

3. **Restore drill.** Once a month, restore one DB from yesterday's backup
   into a scratch container and verify integrity. Add the procedure to
   Phase A's Monday reconciliation ritual.

## How to test recovery yourself

```bash
# Pick the smallest DB backup
PW=$(grep '^BACKUP_GPG_PASSPHRASE=' /home/deployer/underwings/.env | cut -d= -f2-)
SAMPLE=$(ls -1t /home/deployer/backups/2*-metrics-db-warehouse.sql.gz.gpg | head -1)

# Decrypt + decompress + peek
gpg --decrypt --batch --passphrase "$PW" "$SAMPLE" 2>/dev/null | gunzip | head -30
```

This is the single most important Phase G test. If decryption ever stops
working, every backup is useless. Run this any time you doubt yourself.
