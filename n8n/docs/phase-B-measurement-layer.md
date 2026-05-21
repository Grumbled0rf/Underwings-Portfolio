# Phase B — Measurement layer

> **Status:** Infrastructure shipped 2026-05-21. Dashboards await first ETL run + Cloudflare Tunnel setup by founder.
> **Plan reference:** `UNDERWINGS-MASTER-PLAN.md` §7/B

## What was built

1. **`metrics-db`** — Postgres 16 alpine container.
   - Two databases: `metabase` (app state) and `warehouse` (sales data).
   - Three schemas in `warehouse`: `raw`, `analytics`, `ops`.
   - 14 tables seeded by init scripts (10 raw mirror tables, 3 analytics
     marts, 2 ops tables for ETL bookkeeping + Claude API spend).
   - Memory cap 512m, dedicated volume `metrics-db-data`.
2. **`metabase`** — Metabase OSS v0.50.32 container.
   - App DB pointed at `metrics-db` `metabase` database.
   - `MB_SITE_URL=https://metrics.underwings.org` so cookies + redirects work.
   - Memory cap 1500m.
3. **Nginx routing** — server block for `metrics.underwings.org` on port 80
   (no LE cert needed — Cloudflare Tunnel terminates TLS).
4. **n8n workflow `13-warehouse-export.json`** — nightly ETL at 02:00
   Asia/Dubai. Mirrors Krayin tables into `warehouse.raw.*`. **Currently
   inactive in n8n** — see manual activation step below.
5. **n8n workflow `14-daily-ops-summary.json`** — daily Slack micro-summary
   at 08:00 Asia/Dubai. **Currently inactive** — waiting on Slack workspace
   creation (master plan §13 open question 1).
6. **Runbooks:**
   - `runbooks/cloudflare-tunnel-metrics.md` — public access setup
   - `runbooks/metabase-dashboard-setup.md` — first-run + 4 dashboards + 12 SQL questions

## Manual steps remaining (need a human)

| Step | Owner | Blocked by |
|---|---|---|
| Set up Cloudflare account + tunnel + Access policy | Founder | — |
| Create GoDaddy CNAME `metrics → <tunnel>.cfargotunnel.com` | Founder | tunnel created |
| First-run Metabase setup wizard | Founder | tunnel reachable |
| Add `Warehouse` data source in Metabase admin | Founder | first-run done |
| Create n8n credentials: `Krayin MariaDB (read-only)` + `Warehouse Postgres` | Founder (n8n UI) | — |
| Manually trigger workflow `13` once to validate ETL | Founder | credentials in n8n |
| Activate workflow `13` | Founder | first run succeeds |
| Build the 12 KPI questions + 4 dashboards | Founder | warehouse has data |
| Create Slack workspace + #ops channel + incoming webhook | Founder | — |
| Set `SLACK_OPS_WEBHOOK` env var on n8n + activate workflow `14` | Founder | Slack workspace exists |

All steps documented in the two runbooks. Estimated total founder time: ~45 min.

## Acceptance criteria (master plan §7/B)

- [x] Warehouse Postgres reachable on internal network as `metrics-db:5432`
- [x] Metabase reachable via `metrics.underwings.org` (internal — public requires Cloudflare Tunnel)
- [x] Nightly ETL workflow scaffolded
- [x] Daily Slack micro-summary scaffolded
- [ ] All 5 funnel KPIs from master plan §2 rendering on a dashboard
- [ ] Claude API spend captured (requires existing workflows 02 + 05 + future workflows to log every call to `ops.claude_api_calls`)
- [ ] Daily 08:00 summary going to a real Slack channel

Phase B is "shipped" when the bottom 3 are also checked. Until then we're at "infrastructure ready, awaiting first-run + Slack."

## Decisions made

| Decision | Choice | Why |
|---|---|---|
| BI tool | Metabase v0.50.32 OSS | Lowest SQL barrier for 3 founders + non-trivial chart vocabulary out of the box |
| Warehouse | Dedicated Postgres, nightly export | Isolated from Krayin writes, survives Krayin upgrades, daily-grain KPIs don't need real-time |
| Auth | Cloudflare Access via Tunnel | Free, magic-link email login, GoDaddy DNS stays put, ≤50 user limit is fine |
| Subdomain | `metrics.underwings.org` | Consistent with `crm.`, `book.`, `n8n.`, etc. |
| ETL approach | n8n workflow (vs. cron script) | Consistent with existing 6 workflows; failure → Slack alert path already exists |

## Open items deferred to later phases

- Stage transition history (`raw.stage_history`) — schema exists but not
  populated yet. Needs ETL diffing logic or a Krayin trigger. Defer until
  Phase K (continuous tuning) when stage-velocity dashboard surfaces it as
  a need.
- Claude API call logging into `ops.claude_api_calls` — needs to be added
  to workflows 02 and 05 (and future workflows). Cheap one-liner per
  workflow; do as part of Phase K when refining each.
- Analytics marts (`analytics.funnel_daily` etc.) — schema exists but ETL
  doesn't populate them. Queries in dashboards read `raw.*` directly. If
  Metabase gets slow, populate the marts.

## Resource impact

| Resource | Before | After |
|---|---|---|
| Container count | 21 | 23 |
| RAM in use | ~8.6 GB | ~10 GB |
| Disk | 78% | ~80% (Metabase image + data volume) |
| Public attack surface | unchanged (no new public port) | unchanged |
