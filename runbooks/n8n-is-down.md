# Runbook — n8n is down

> **Severity:** P1 — every inbound lead is being silently dropped.
> **Time to mitigation:** target ≤ 4 hours.

## Detect

You'll know because:
- `https://n8n.underwings.org` returns 502 or refuses connection.
- `#new-leads` Slack channel has been silent for > 6 hours during business hours.
- Krayin shows no new leads from the website despite form submissions.
- Uptime Kuma alert fires.

## Triage (5 minutes)

```bash
docker compose ps n8n n8n-db
docker compose logs --tail=80 n8n
docker compose logs --tail=30 n8n-db
free -h          # OOM?
df -h /          # disk full?
```

Common causes ranked by likelihood:
1. n8n-db is unhealthy (Postgres OOM, full disk, corruption).
2. n8n itself OOM'd — recent workflow loop / large execution data.
3. Disk full (n8n executions table is large; pruning has fallen behind).
4. Bad workflow JSON imported manually (edit error).
5. n8n image upgrade broke compatibility.

## Mitigate

### If n8n container is unhealthy but n8n-db is fine:
```bash
docker compose restart n8n
sleep 30
docker compose ps n8n   # should be healthy
curl -sS https://n8n.underwings.org/healthz   # 200 OK?
```

### If n8n-db is unhealthy:
```bash
docker compose restart n8n-db
sleep 15
docker compose restart n8n
```

### If disk full:
```bash
df -h /
# n8n stores executions in its DB. Force aggressive prune:
docker compose exec n8n-db psql -U n8n -d n8n -c "DELETE FROM execution_entity WHERE finished < NOW() - INTERVAL '3 days';"
docker compose exec n8n-db psql -U n8n -d n8n -c "VACUUM FULL execution_entity;"

# Also clean docker
docker system prune -af --volumes=false
```

### If you can't recover quickly — manual webhook receiver:

This buys you time. Run a tiny FastAPI / Express receiver on a spare port
that logs every payload to `/tmp/leads-queue/`. Replay into Krayin once
n8n is back.

```bash
# Example one-liner using netcat-style logger:
python3 -m http.server 8888 --bind 0.0.0.0 --directory /tmp &  # NOT for production
# better: write a small receiver, this is just to capture during outage
```

Once n8n is back, dump `/tmp/leads-queue/` into Krayin via the
`webhook-contact.php` endpoint (token in `.env`).

## Restore from backup (worst case)

`/home/deployer/backups/<latest-date>/*-n8n-db-n8n.sql.gz.gpg` exists.

```bash
PW=$(grep '^BACKUP_GPG_PASSPHRASE=' /home/deployer/underwings/.env | cut -d= -f2-)
LATEST=$(ls -1t /home/deployer/backups/2*-n8n-db-n8n.sql.gz.gpg 2>/dev/null | head -1)
docker compose stop n8n
docker compose exec -T n8n-db dropdb -U n8n n8n
docker compose exec -T n8n-db createdb -U n8n n8n
gpg --decrypt --batch --passphrase "$PW" "$LATEST" | gunzip | docker compose exec -T n8n-db psql -U n8n -d n8n
docker compose start n8n
```

## Postmortem (after the fire is out)

- What was the trigger?
- Did the alert fire? If not, why? Add the missing probe.
- How long was the funnel-top down? Estimate lost leads.
- Is there a workflow-level guard we're missing?
- Update this runbook with anything new you learned.
