# Founder Action Checklist — what claude-code needs from you

> **Purpose:** single source of truth for the human-side work blocking
> Phases B, C, and G. Everything on this list either I cannot do
> (browser, billing, account setup) or needs your explicit decision.
> **Total time:** ~60 minutes, split across 5 contexts.
> **Each task tells you exactly what to paste back to me at the end.**

---

## Big picture: what I need from you, in 3 categories

### 📤 Things to paste back to me in chat (final outputs)
| # | Item | After completing |
|---|---|---|
| 1 | `DOCUMENSO_API_KEY=...` | Documenso first-run |
| 2 | `DOCUMENSO_WEBHOOK_SECRET=...` | Documenso webhook config |
| 3 | `SLACK_OPS_WEBHOOK=https://hooks.slack.com/services/...` | Slack incoming-webhooks |
| 4 | `SLACK_SALES_WEBHOOK=https://hooks.slack.com/services/...` | Slack incoming-webhooks |
| 5 | `SLACK_NEW_LEADS_WEBHOOK=https://hooks.slack.com/services/...` | Slack incoming-webhooks |
| 6 | `SLACK_CS_WEBHOOK=https://hooks.slack.com/services/...` | Slack incoming-webhooks |

### 🔧 Things you run once on the server
| # | Command | What it does |
|---|---|---|
| 1 | `sudo bash /home/deployer/underwings/deploy/install-timers.sh` | Enables nightly DB backups + n8n drift detection |

### 📋 Things you configure in browser (no paste-back needed — just confirm "done")
| # | Location | What |
|---|---|---|
| 1 | Cloudflare Zero Trust | Account + tunnel + 2 hostnames + Access policies |
| 2 | GoDaddy DNS | 2 CNAMEs (`metrics` and `sign`) |
| 3 | Metabase web UI | First-run wizard + add Warehouse data source + 4 dashboards |
| 4 | n8n web UI | 2 credentials + import 3 workflows + activate |

---

## Order of work (recommended)

Do them in this order to minimise context switching. Sections 1 → 2 → 3 → 4 → 5.

```
1. Cloudflare       (15 min)   ──┐
                                  ├─ unlocks metrics + sign URLs publicly
2. GoDaddy DNS      ( 2 min)   ──┘

3. Slack            (10 min)      ─── unlocks all alerts

4. Metabase         (25 min)      ─── unlocks Phase B dashboards

5. Documenso        (10 min)      ─── unlocks Phase C e-sign

6. n8n + timers     ( 5 min)      ─── activates everything
```

---

## Section 1 — Cloudflare (15 min)

> **Goal:** make `metrics.underwings.org` and `sign.underwings.org`
> reachable from anywhere, behind email-magic-link login.
> **Detailed runbook:** `runbooks/cloudflare-tunnel-metrics.md`.

### 1a. Create Cloudflare account + Zero Trust workspace
1. https://dash.cloudflare.com → sign up (or sign in if you have one).
2. Top-left menu → **Zero Trust** → Get Started.
3. Team name: `underwings`. Free plan is fine.

### 1b. Create the tunnel
1. Zero Trust → **Networks → Tunnels → Create a tunnel**.
2. Connector type: **Cloudflared**.
3. Name: `underwings-vps`.
4. **Save**. The next screen shows an install command like
   `sudo cloudflared service install <LONG_TOKEN>`. Copy the entire command.

📤 **Paste the install command back to me in chat.** I'll run it on the VPS — that's the cloudflared install step.

### 1c. Add public hostnames (do this AFTER I confirm cloudflared is installed)

Once I confirm cloudflared is running, in the same tunnel detail page:

**For metrics:**
- Public Hostnames → **Add a public hostname**.
- Subdomain: `metrics`, Domain: `underwings.org`.
- Service: `http://127.0.0.1:80`.
- **HTTP Settings → HTTP Host Header: `metrics.underwings.org`** ← critical.
- Save.

**For sign (repeat):**
- Subdomain: `sign`, Domain: `underwings.org`.
- Service: `http://127.0.0.1:80`.
- **HTTP Settings → HTTP Host Header: `sign.underwings.org`** ← critical.
- Save.

### 1d. Cloudflare Access — 2 applications
**Application 1 — Metrics:**
- Zero Trust → **Access → Applications → Add an application → Self-hosted**.
- Name: `Underwings Metrics`. Domain: `metrics.underwings.org`. Session: 24h.
- Policy: **Allow** → Include: Emails → enter your 3 principal emails.
- Save.

**Application 2 — Sign (with webhook bypass!):**
- Same as above but: Name: `Underwings Sign`. Domain: `sign.underwings.org`.
- Policy 1: **Allow** → same 3 emails.
- **Policy 2: Bypass** → Action: Bypass → Path matches `/api/webhooks/*`
  (this is critical — without it Documenso → n8n signature callbacks get blocked).
- Save.

✅ **Confirm done in chat: "Cloudflare tunnel + 2 hostnames + 2 Access apps configured."**

---

## Section 2 — GoDaddy DNS (2 min)

> **Goal:** point `metrics.underwings.org` and `sign.underwings.org` at the tunnel.

You'll need the tunnel UUID — visible in the Cloudflare tunnel page (looks like `abc123def-1234-5678-90ab-...`). The CNAME target is `<uuid>.cfargotunnel.com`.

GoDaddy → DNS Management for underwings.org → Add Record:

| Type | Name | Value | TTL |
|---|---|---|---|
| CNAME | `metrics` | `<uuid>.cfargotunnel.com` | 1 hour |
| CNAME | `sign` | `<uuid>.cfargotunnel.com` | 1 hour |

✅ **Confirm done in chat: "DNS records added."** DNS propagates in ~5-30 min.

---

## Section 3 — Slack (10 min)

> **Goal:** 4 incoming webhook URLs.
> **Detailed runbook:** `runbooks/slack-workspace-setup.md`.

### 3a. (Already done by you) workspace + channels + app exist

### 3b. Get the webhook URLs — the trick

1. https://api.slack.com/apps → click **Underwings BOT**.
2. **Left sidebar — click "Incoming Webhooks"** (NOT "OAuth & Permissions").
   - Right page shows: an "Activate Incoming Webhooks" toggle at top, and a
     button labelled **"Add New Webhook to Workspace"** lower down.
   - Wrong page (OAuth & Permissions) shows: tokens starting with `xoxp-`,
     `xoxb-`, `xoxe-`. **Do NOT paste those — they are different credentials.**
3. Toggle **Activate Incoming Webhooks** → **On**. Save.
4. Scroll down → **Add New Webhook to Workspace** → pick `#ops` → **Allow**.
5. Copy the URL (starts with `https://hooks.slack.com/services/...`).
6. Repeat 3 more times for `#sales-pipeline`, `#new-leads`, `#client-success`.

📤 **Paste in chat:**
```
SLACK_OPS_WEBHOOK=<url for #ops>
SLACK_SALES_WEBHOOK=<url for #sales-pipeline>
SLACK_NEW_LEADS_WEBHOOK=<url for #new-leads>
SLACK_CS_WEBHOOK=<url for #client-success>
```

---

## Section 4 — Metabase (25 min)

> **Goal:** activate 4 KPI dashboards.
> **Detailed runbook:** `runbooks/metabase-dashboard-setup.md`.
> **Prerequisite:** Section 1 + 2 (you can reach `metrics.underwings.org`).

### 4a. First-run wizard
1. Visit `https://metrics.underwings.org`.
2. Cloudflare Access prompts for an email — enter your `@underwings.org` address.
3. Click the magic link in your inbox → land on the Metabase setup wizard.
4. Email: your founder address. First/last name: yours.
5. **Site name: `Underwings Metrics`**.
6. "Add a database" step → **Skip for now** (we do it next).

### 4b. Add Warehouse data source
Admin gear (top-right) → **Admin settings → Databases → Add database**:
- Type: **PostgreSQL**.
- Name: **Warehouse**.
- Host: **`metrics-db`**, Port: **`5432`**, Database: **`warehouse`**.
- Username: **`warehouse_admin`**.
- Password: from `/home/deployer/underwings/.env` line `METRICS_DB_PASSWORD=...`.
  (You can SSH in and `grep METRICS_DB_PASSWORD .env` — don't paste it in chat.)
- Schemas (advanced): **`raw, analytics, ops`**.
- Save.

### 4c. Create dashboards
- Open `runbooks/metabase-dashboard-setup.md` in this repo.
- Copy-paste the 12 SQL queries into 4 dashboards (Funnel, Channel performance,
  Stage velocity, Cost per booked call). Each Q has its visualisation type
  noted next to it.

✅ **Confirm done: "Metabase dashboards live."**

---

## Section 5 — Documenso (10 min)

> **Goal:** API key + webhook secret for workflows 07 + 08.
> **Detailed runbook:** `runbooks/documenso-deployment.md`.
> **Prerequisite:** Section 1 + 2 (you can reach `sign.underwings.org`).

### 5a. First-run setup
1. Visit `https://sign.underwings.org` (Access prompts, magic-link, login).
2. Land on Documenso setup → admin account with your founder email.
3. Team: `Underwings Cybersecurity Solutions`.

### 5b. Generate API token
- Top-right avatar → **Account → API Tokens → Create**.
- Name: `n8n integration`.
- Copy the generated token (it's shown ONCE — if you lose it, generate a new one).

📤 **Paste in chat:**
```
DOCUMENSO_API_KEY=<the token>
```

### 5c. Configure webhook
- Team settings → **Webhooks → Add webhook**.
- URL: `https://n8n.underwings.org/webhook/documenso/signed`
- Events: `document.completed`.
- Secret: generate one with `openssl rand -hex 24` (on the VPS or your laptop) and paste it.

📤 **Paste in chat:**
```
DOCUMENSO_WEBHOOK_SECRET=<the secret you just generated>
```

---

## Section 6 — n8n + timers (5 min)

> **Goal:** activate workflows 13, 14, 07, 08 + enable nightly backups.

### 6a. Create 2 credentials in n8n UI
1. Visit `https://n8n.underwings.org` → log in.
2. Top-right → Credentials → **+ Add credential**:
   - **Type: MySQL**
   - **Name: `Krayin MariaDB (read-only)`**
   - Host: `krayin-db`, Port: 3306, Database: `krayin`,
     User: `krayin`, Password: `KrCrmUnderwings2026x` (from docker-compose.yml).
   - Save.
3. **+ Add credential** again:
   - **Type: Postgres**
   - **Name: `Warehouse Postgres`**
   - Host: `metrics-db`, Port: 5432, Database: `warehouse`,
     User: `warehouse_admin`, Password: from `.env` `METRICS_DB_PASSWORD`.
   - Save.

### 6b. Import workflows
- Workflows → **+ Add workflow → Import from File**.
- Import `n8n/workflows/13-warehouse-export.json`.
- Import `n8n/workflows/14-daily-ops-summary.json`.
- Import `n8n/workflows/07-proposal-generator.json`.
- Import `n8n/workflows/08-onboarding-kickoff.json`.

### 6c. Manually trigger workflow 13 once to validate ETL
- Open workflow 13 → click **Execute Workflow** (play button top-right).
- Wait ~5 seconds → check Metabase Warehouse tables — `raw.leads` should now have rows.

### 6d. Activate the workflows
- Top-right toggle on each of 13, 14, 07, 08 → **Active**.

### 6e. Enable timers (one shell command on the VPS)
```
sudo bash /home/deployer/underwings/deploy/install-timers.sh
```

✅ **Confirm done: "n8n creds + workflows + timers all enabled."**

---

## Quick sanity check at the end

After all sections complete, claude-code will:
1. Test every Slack webhook (you'll see test messages in each channel within 30s).
2. Tail Documenso + n8n logs while you trigger a `[TEST]` lead end-to-end.
3. Verify backup timer next-fire time.
4. Confirm Cloudflare Access logs show the 3 principal logins.
5. Update master plan §13 to remove all "pending" items.

Then Phases B, C, and G are genuinely done — first paying client can flow through the whole pipeline.

---

## If you get stuck

Tell me **which section / step number** you're on and what you're seeing. Screenshots of the actual screen are gold — paste them in chat.

**Do NOT paste:**
- OAuth tokens (anything starting with `xoxp-`, `xoxb-`, `xoxe-`).
- Database passwords (read them server-side via SSH; never paste raw).
- Cloudflare account tokens.

**Safe to paste:**
- Slack incoming-webhook URLs (start with `https://hooks.slack.com/services/`).
- Documenso API key + webhook secret (these are scoped to Documenso only).
- The cloudflared install command (it's a one-time bootstrap token).
- Error messages and screenshots.
