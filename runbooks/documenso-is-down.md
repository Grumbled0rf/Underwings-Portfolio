# Runbook — Documenso is down

> **Severity:** P2 — clients can't sign new proposals. Existing in-flight envelopes are unaffected if already sent.
> **Time to mitigation:** target ≤ 8 hours.

## Detect

- `https://sign.underwings.org` returns 502 or refuses connection.
- Signed-proposal Slack pings have stopped in `#client-success`.
- Workflow `07-proposal-generator` fails at the "Documenso: create envelope" step.

## Triage

```bash
docker compose ps documenso documenso-db
docker compose logs --tail=80 documenso
docker compose logs --tail=30 documenso-db
docker compose exec nginx curl -sS \
  --resolve sign.underwings.org:80:127.0.0.1 \
  http://sign.underwings.org/api/health   # expect {"status":"ok",...}
```

## Mitigate

```bash
docker compose restart documenso-db
sleep 15
docker compose restart documenso
sleep 60
# Recheck /api/health
```

## Bypass during outage (manual proposal signing)

If a client is waiting on a proposal during the outage:
1. The render sidecar still works — workflow 07 produced the PDF before the Documenso step failed. Find it in `/tmp/proposals/UW-*/proposal.pdf` inside the `pandoc-render` container.
   ```bash
   docker compose exec -T pandoc-render ls -la /tmp/proposals/
   docker cp underwings-pandoc-render:/tmp/proposals/UW-<ref>/proposal.pdf /tmp/
   ```
2. Email the PDF directly to the client with a manual signature request ("please reply 'accepted' or print, sign, scan").
3. Manually move the Krayin lead to "Proposal Sent" via the admin UI.
4. When Documenso returns, re-issue the envelope via the n8n form for the audit trail — mark the original as "manually accepted on YYYY-MM-DD".

## Restore from backup

Signed contracts are legal records — backup decryption MUST work.

```bash
PW=$(grep '^BACKUP_GPG_PASSPHRASE=' /home/deployer/underwings/.env | cut -d= -f2-)
LATEST=$(ls -1t /home/deployer/backups/2*-documenso-db-documenso.sql.gz.gpg 2>/dev/null | head -1)
docker compose stop documenso
docker compose exec -T documenso-db dropdb -U documenso documenso
docker compose exec -T documenso-db createdb -U documenso documenso
gpg --decrypt --batch --passphrase "$PW" "$LATEST" | gunzip | docker compose exec -T documenso-db psql -U documenso -d documenso
docker compose start documenso
```

## Postmortem

- Did the PDF artefacts survive? (Should — they're in the sidecar's ephemeral /tmp, ~1 day retention.)
- Any signatures in flight when it died? Customer notification needed?
- Did any client experience confusion? Send recovery email.
