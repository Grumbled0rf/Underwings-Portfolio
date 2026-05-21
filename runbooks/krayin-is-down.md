# Runbook — Krayin is down

> **Severity:** P0 — Krayin is the single source of truth for sales leads.
> **Time to mitigation:** target ≤ 2 hours.

## Detect

- `https://crm.underwings.org` returns 502 or login fails.
- n8n workflows fail at the Krayin step — Slack `#ops` will show "krayin upstream connect failed" if the daily summary is set up.
- `#sales-pipeline` proposal-sent notifications missing.

## Triage (5 minutes)

```bash
docker compose ps krayin krayin-db
docker compose logs --tail=80 krayin
docker compose logs --tail=30 krayin-db
```

Common causes:
1. Krayin's MariaDB (mariadb-db data corruption — disk filled).
2. Container hit OOM (1 GB cap may be too low under heavy load).
3. The fix-krayin.sh setup wasn't re-run after a restart — webhooks 401 (token missing in .env inside container) but admin UI works. *See `feedback_krayin_env_regen` memory entry.*
4. The Webkul image was pulled with breaking changes (latest tag).

## Mitigate

### If Krayin is up but webhooks 401:
```bash
bash /home/deployer/underwings/krayin/fix-krayin.sh
```
This re-injects `WEBHOOK_TOKEN` + nginx routes inside the container.

### If Krayin container is unhealthy:
```bash
docker compose restart krayin
sleep 30
# Webkul entrypoint wipes .env on start — MUST re-run fix:
bash /home/deployer/underwings/krayin/fix-krayin.sh
```

### If krayin-db is the problem:
```bash
docker compose restart krayin-db
sleep 20
docker compose restart krayin
bash /home/deployer/underwings/krayin/fix-krayin.sh
```

## Restore from backup (data loss scenario)

```bash
PW=$(grep '^BACKUP_GPG_PASSPHRASE=' /home/deployer/underwings/.env | cut -d= -f2-)
LATEST=$(ls -1t /home/deployer/backups/2*-krayin-db-krayin.sql.gz.gpg 2>/dev/null | head -1)
docker compose stop krayin
docker compose exec -T krayin-db mariadb -uroot -pKrRootUnderwings2026x -e 'DROP DATABASE krayin; CREATE DATABASE krayin;'
gpg --decrypt --batch --passphrase "$PW" "$LATEST" | gunzip | docker compose exec -T krayin-db mariadb -uroot -pKrRootUnderwings2026x krayin
docker compose start krayin
bash /home/deployer/underwings/krayin/fix-krayin.sh
```

Worst case data loss: 24 hours (nightly backup at 02:30).

## Stop the bleeding while Krayin is dead

Inbound n8n workflow `01-inbound-lead-capture` will fail at the Krayin step. Three options while you fix:

1. **Park leads in n8n DB** — n8n's `execution_entity` will hold the payload. Replay after Krayin comes back. (Default — no action needed.)
2. **Email fallback** — temporarily route the lead-capture workflow to email Manoj instead of Krayin.
3. **Pause inbound** — n8n UI → workflow 01 → toggle inactive. Leads are dropped during the pause.

Option 1 is the default and what n8n does naturally.

## Postmortem

- What was the trigger?
- Did fix-krayin.sh need running? Update its automation priority.
- Was the backup good? Did decryption work?
- Estimated leads stuck in n8n / dropped: ___
- Update this runbook.
