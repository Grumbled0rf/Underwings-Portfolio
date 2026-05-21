# Runbook — Documenso (self-hosted e-sign) at `sign.underwings.org`

> **Purpose:** deploy Documenso, the self-hosted e-signature service, so
> proposals signed by clients land back in our pipeline automatically.
> **Plan reference:** UNDERWINGS-MASTER-PLAN.md §7/C + spec §4.1
> **Audience:** founder for the browser config; claude-code for the
> docker-compose bits.
> **Time:** ~30 min total (~10 min founder browser, ~5 min CLI, ~15 min DNS propagation wait).

## Why Documenso

- **Self-hosted** — signed proposals + audit trail stay on UAE servers (PDPL data residency).
- **Free** — no per-envelope fee. Material at our deal volume.
- **API-first** — we trigger signature requests and consume signature webhooks from n8n.
- **Open source** — auditable; not locked into a vendor contract.

## Prerequisites

- Cloudflare account + tunnel already running (see `cloudflare-tunnel-metrics.md`).
- SMTP server reachable (`stalwart` on the underwings network — already used by other services).
- ~1.5 GB free RAM, ~1 GB free disk.

## Deployment plan

### Step 1 — Add containers to docker-compose

Two new services: `documenso-db` (Postgres 16) + `documenso` (Node app).

Open `/home/deployer/underwings/docker-compose.yml` and insert below the
existing `metabase` service (before `volumes:`):

```yaml
  # ============================================================
  # PHASE C — Documenso self-hosted e-sign
  # ============================================================
  documenso-db:
    image: postgres:16-alpine
    container_name: underwings-documenso-db
    restart: always
    environment:
      - POSTGRES_USER=documenso
      - POSTGRES_PASSWORD=${DOCUMENSO_DB_PASSWORD}
      - POSTGRES_DB=documenso
      - TZ=Asia/Dubai
    volumes:
      - documenso-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U documenso"]
      interval: 15s
      timeout: 5s
      retries: 10
    deploy:
      resources:
        limits:
          memory: 384m
    networks:
      - underwings-network

  documenso:
    image: documenso/documenso:latest
    container_name: underwings-documenso
    restart: always
    environment:
      - NEXTAUTH_URL=https://sign.underwings.org
      - NEXTAUTH_SECRET=${DOCUMENSO_NEXTAUTH_SECRET}
      - NEXT_PRIVATE_ENCRYPTION_KEY=${DOCUMENSO_ENCRYPTION_KEY}
      - NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=${DOCUMENSO_ENCRYPTION_KEY_SECONDARY}
      - NEXT_PRIVATE_DATABASE_URL=postgresql://documenso:${DOCUMENSO_DB_PASSWORD}@documenso-db:5432/documenso
      - NEXT_PRIVATE_DIRECT_DATABASE_URL=postgresql://documenso:${DOCUMENSO_DB_PASSWORD}@documenso-db:5432/documenso
      - NEXT_PRIVATE_SMTP_TRANSPORT=smtp-auth
      - NEXT_PRIVATE_SMTP_HOST=stalwart
      - NEXT_PRIVATE_SMTP_PORT=587
      - NEXT_PRIVATE_SMTP_USERNAME=newsletter@underwings.org
      - NEXT_PRIVATE_SMTP_PASSWORD=Newsletter@1415!
      - NEXT_PRIVATE_SMTP_FROM_NAME=Underwings
      - NEXT_PRIVATE_SMTP_FROM_ADDRESS=newsletter@underwings.org
      - NEXT_PUBLIC_WEBAPP_URL=https://sign.underwings.org
      - NEXT_PUBLIC_MARKETING_URL=https://underwings.org
      - PORT=3000
    depends_on:
      documenso-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 10
      start_period: 120s
    deploy:
      resources:
        limits:
          memory: 1024m
    networks:
      - underwings-network
```

And in the `volumes:` block, add:
```yaml
  documenso-db-data:
```

### Step 2 — Generate secrets and append to `.env`

```bash
DOCUMENSO_DB_PASSWORD=$(openssl rand -hex 24)
DOCUMENSO_NEXTAUTH_SECRET=$(openssl rand -hex 32)
DOCUMENSO_ENCRYPTION_KEY=$(openssl rand -hex 32)
DOCUMENSO_ENCRYPTION_KEY_SECONDARY=$(openssl rand -hex 32)

cat >> /home/deployer/underwings/.env <<EOF

# ─── Phase C — Documenso ───
DOCUMENSO_DB_PASSWORD=${DOCUMENSO_DB_PASSWORD}
DOCUMENSO_NEXTAUTH_SECRET=${DOCUMENSO_NEXTAUTH_SECRET}
DOCUMENSO_ENCRYPTION_KEY=${DOCUMENSO_ENCRYPTION_KEY}
DOCUMENSO_ENCRYPTION_KEY_SECONDARY=${DOCUMENSO_ENCRYPTION_KEY_SECONDARY}
EOF
```

The `.env` is gitignored — no leakage risk.

### Step 3 — Nginx server block

Add to `/home/deployer/underwings/nginx/nginx.conf` (near the `metrics.underwings.org` block):

```nginx
    # ===========================================
    # sign.underwings.org — Documenso (e-sign)
    # Reached via Cloudflare Tunnel; TLS at Cloudflare edge.
    # ===========================================
    server {
        listen 80;
        server_name sign.underwings.org;

        client_max_body_size 50m;

        location / {
            proxy_pass http://documenso:3000;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;

            # Next.js HMR-style websocket (used by Documenso live preview)
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
            proxy_buffering off;
        }
    }
```

### Step 4 — Start + smoke test

```bash
cd /home/deployer/underwings
docker compose up -d documenso-db documenso
docker compose restart nginx     # bind-mounted single-file gotcha
sleep 90                          # Documenso first-run migrations take ~60s
docker compose ps documenso documenso-db
docker compose exec -T nginx curl -sS -o /dev/null \
  --resolve sign.underwings.org:80:127.0.0.1 \
  -w 'HTTP %{http_code}\n' \
  http://sign.underwings.org/api/health
# Expect HTTP 200
```

### Step 5 — Cloudflare Tunnel hostname

In Zero Trust → Networks → Tunnels → underwings-vps → Public Hostnames:
- Add hostname
- Subdomain: `sign`
- Domain: `underwings.org`
- Service: `http://127.0.0.1:80`
- HTTP Settings → HTTP Host Header: `sign.underwings.org`
- Save

### Step 6 — GoDaddy DNS

Add CNAME: `sign → <tunnel-uuid>.cfargotunnel.com` (same tunnel as `metrics`).

### Step 7 — Cloudflare Access policy

Zero Trust → Access → Applications → Add application → Self-hosted:
- Application name: `Underwings — Sign`
- Application domain: `sign.underwings.org`
- Session duration: 24h
- Policy: **Allow** for `manoj@underwings.org`, `nelson@underwings.org`, `vinoth@underwings.org`
- **Important:** add a second policy **Bypass** for the webhook endpoint
  `sign.underwings.org/api/webhooks/*` — client signature webhooks back to
  n8n must not be blocked by Access. (Or use a service token; see Documenso docs.)

### Step 8 — Documenso first-run setup

Visit `https://sign.underwings.org` from a browser logged in via Access.

1. **Admin account** — use `admin@underwings.org` (or a founder address).
2. **Team setup** — create team "Underwings Cybersecurity Solutions".
3. **API key** — Account → API Tokens → Create. Name: `n8n integration`.
   Copy the token; we'll use it in workflow 07-proposal-generator.
4. **Webhook configuration** — Team settings → Webhooks → Add webhook:
   - URL: `https://n8n.underwings.org/webhook/documenso/signed`
   - Events: `document.completed`
   - Secret: generate via `openssl rand -hex 24` and save it; n8n verifies HMAC.

### Step 9 — Add API token + webhook secret to .env

```bash
cat >> /home/deployer/underwings/.env <<EOF

# ─── Documenso integration tokens ───
DOCUMENSO_API_KEY=<paste from Step 8.3>
DOCUMENSO_WEBHOOK_SECRET=<paste from Step 8.4>
EOF
docker compose restart n8n
```

### Step 10 — Smoke test end-to-end (one for real)

After workflow 07-proposal-generator is deployed:
1. Create a `[TEST]` lead in Krayin with title `[TEST] Smoke Test ${date}`, stage = Scoping.
2. Trigger workflow 07-proposal-generator manually.
3. A test envelope should appear in Documenso → Documents.
4. Sign the test envelope from your own email.
5. Workflow 08-onboarding-kickoff should fire and move the lead to Won.
6. Delete the test lead.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `documenso` container restarts forever | DB migrations failed | `docker compose logs documenso` — usually `NEXTAUTH_SECRET` or `NEXT_PRIVATE_ENCRYPTION_KEY` missing/empty |
| `sign.underwings.org` returns 502 | nginx upstream cache after restart | `docker compose exec nginx nginx -s reload` |
| Signature webhook never arrives | Cloudflare Access blocking | Add Bypass policy for `/api/webhooks/*` (Step 7) |
| Documenso signup emails not sending | SMTP auth | Stalwart logs (`docker compose logs mail \| grep documenso`); confirm `newsletter@underwings.org` credentials match the env vars |

## Rollback

If Documenso breaks the stack:
```bash
docker compose stop documenso documenso-db
# Service is opt-in — nothing else depends on it
```

To remove entirely:
```bash
docker compose down documenso documenso-db
docker volume rm underwings_documenso-db-data
# Then comment out the two service blocks in docker-compose.yml
# Remove DOCUMENSO_* lines from .env
```

## Notes

- **Data residency:** the underwings VPS is the data residency boundary. Cloudflare Access logs (login attempts) live in Cloudflare's US infrastructure — note this in the PDPL RoPA (Phase F).
- **Backups:** documenso-db should be added to the Phase G nightly backup job (encrypted, S3-bound). Signed contracts are legal records.
