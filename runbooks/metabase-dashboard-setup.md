# Runbook — Metabase first-run + dashboard setup

> **Purpose:** seed the four KPI dashboards from master plan §7/B.
> **Prerequisite:** Cloudflare Tunnel + Access set up
> (see `runbooks/cloudflare-tunnel-metrics.md`); Phase B ETL workflow has
> run at least once and `warehouse.raw.leads` has data.
> **Audience:** founder (browser).
> **Time:** ~25 minutes.

## Step 1 — First-run setup

1. Visit `https://metrics.underwings.org` (Cloudflare Access prompts; log in).
2. Metabase setup wizard:
   - **Email:** the founder doing setup
   - **First name / Last name:** their own
   - **Site name:** `Underwings Metrics`
   - **Add a database:** **Skip for now** (we add it next).
3. After setup, you land on the home page as admin.

## Step 2 — Add the warehouse as a data source

Admin gear (top-right) → **Admin settings → Databases → Add database**:
- **Database type:** PostgreSQL
- **Name:** `Warehouse`
- **Host:** `metrics-db`
- **Port:** `5432`
- **Database name:** `warehouse`
- **Username:** `warehouse_admin`
- **Password:** value of `METRICS_DB_PASSWORD` from `/home/deployer/underwings/.env`
- **Schemas (advanced):** `raw, analytics, ops`
- **Save**.

Wait ~30s for the initial sync (Metabase scans columns + sample values).

## Step 3 — Create the four dashboards

For each of the four below: **New → Question → Native query → pick
"Warehouse" database**, paste the SQL, **Save** (group under "KPIs"),
then add to a new dashboard.

### Dashboard 1 — Funnel (master plan §2)

Create dashboard "Funnel" and add these 5 questions as tiles:

**Q1: Leads by stage (current snapshot)**
```sql
SELECT p.name AS pipeline,
       s.name AS stage,
       s.sort_order,
       COUNT(l.id) AS leads
FROM raw.leads l
JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
JOIN raw.lead_pipelines p ON p.id = l.lead_pipeline_id
WHERE l.status = 1                       -- open only
GROUP BY p.name, s.name, s.sort_order
ORDER BY p.name, s.sort_order;
```
Visualisation: **Pivot table** (rows = pipeline, columns = stage).

**Q2: New leads this week**
```sql
SELECT COUNT(*) AS new_leads_this_week
FROM raw.leads
WHERE created_at >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Dubai');
```
Visualisation: **Number**, target = 15.

**Q3: MQLs this week** (assumes MQL = stage_id 14 for P4, 56 for P5, 67 for P6 — confirm against `docs/krayin-ids-reference.md`)
```sql
SELECT COUNT(*) AS mql_this_week
FROM raw.leads
WHERE lead_pipeline_stage_id IN (
  SELECT id FROM raw.lead_pipeline_stages WHERE name IN ('MQL', 'Qualified', 'Requirements Gathered')
)
AND updated_at >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Dubai');
```
Visualisation: **Number**, target = 5.

**Q4: Discovery calls booked this week**
```sql
SELECT COUNT(*) AS booked_this_week
FROM raw.leads
WHERE lead_pipeline_stage_id IN (
  SELECT id FROM raw.lead_pipeline_stages WHERE name IN ('Discovery Booked', 'Demo Booked')
)
AND updated_at >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Dubai');
```
Visualisation: **Number**, target = 3.

**Q5: Funnel conversion (last 90d)**
```sql
WITH base AS (
  SELECT l.id, s.name AS stage_name, p.name AS pipeline
  FROM raw.leads l
  JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
  JOIN raw.lead_pipelines p ON p.id = l.lead_pipeline_id
  WHERE l.created_at >= NOW() - INTERVAL '90 days'
)
SELECT pipeline, stage_name, COUNT(*) AS leads
FROM base GROUP BY pipeline, stage_name ORDER BY pipeline, leads DESC;
```
Visualisation: **Bar chart**, broken down by pipeline.

### Dashboard 2 — Channel performance

**Q6: Leads by source (last 30 days)**
```sql
SELECT src.name AS source,
       COUNT(l.id) AS leads,
       COUNT(*) FILTER (WHERE l.lead_pipeline_stage_id IN (
         SELECT id FROM raw.lead_pipeline_stages WHERE name IN ('MQL','Qualified','Requirements Gathered','Discovery Booked','Demo Booked','Scoping','Proposal Sent','Negotiation','Quote Sent','Won','Trial Active','Contract Sent')
       )) AS qualified,
       ROUND(100.0 * COUNT(*) FILTER (WHERE l.lead_pipeline_stage_id IN (
         SELECT id FROM raw.lead_pipeline_stages WHERE name IN ('MQL','Qualified','Requirements Gathered')
       )) / NULLIF(COUNT(l.id), 0), 1) AS lead_to_mql_pct
FROM raw.leads l
JOIN raw.lead_sources src ON src.id = l.lead_source_id
WHERE l.created_at >= NOW() - INTERVAL '30 days'
GROUP BY src.name
ORDER BY leads DESC;
```
Visualisation: **Table**.

**Q7: Won deals by source (last 90 days)**
```sql
SELECT src.name AS source,
       COUNT(l.id) AS won_deals,
       SUM(l.lead_value) AS total_aed
FROM raw.leads l
JOIN raw.lead_sources src ON src.id = l.lead_source_id
JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
WHERE s.name = 'Won'
  AND l.closed_at >= NOW() - INTERVAL '90 days'
GROUP BY src.name
ORDER BY total_aed DESC NULLS LAST;
```
Visualisation: **Bar chart**.

### Dashboard 3 — Stage velocity

**Q8: Avg days per stage (last 90d, Pipeline 4 only)**
```sql
SELECT s.name AS stage,
       s.sort_order,
       ROUND(AVG(EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400)::numeric, 1) AS avg_days_in_stage,
       COUNT(*) AS sample_size
FROM raw.leads l
JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
WHERE l.lead_pipeline_id = 4
  AND l.updated_at >= NOW() - INTERVAL '90 days'
GROUP BY s.name, s.sort_order
ORDER BY s.sort_order;
```
Visualisation: **Bar chart**, x = stage, y = avg_days.

**Q9: Rotten leads** (open > rotten_days)
```sql
SELECT p.name AS pipeline,
       s.name AS stuck_at_stage,
       l.title,
       l.id AS lead_id,
       EXTRACT(DAY FROM NOW() - l.updated_at)::int AS days_stuck
FROM raw.leads l
JOIN raw.lead_pipelines p ON p.id = l.lead_pipeline_id
JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
WHERE l.status = 1
  AND EXTRACT(DAY FROM NOW() - l.updated_at) > p.rotten_days
ORDER BY days_stuck DESC;
```
Visualisation: **Table** with conditional formatting (red if > 2× rotten_days).

### Dashboard 4 — Cost per booked call

**Q10: Claude API spend today**
```sql
SELECT
  ROUND(SUM(cost_aed)::numeric, 2) AS aed_today,
  COUNT(*) AS api_calls_today
FROM ops.claude_api_calls
WHERE called_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Dubai');
```
Visualisation: **Number**, alert if > AED 100 (matches master plan §11/9).

**Q11: Claude API spend by workflow (last 30 days)**
```sql
SELECT workflow_name,
       COUNT(*) AS calls,
       SUM(input_tokens + output_tokens) AS total_tokens,
       ROUND(SUM(cost_aed)::numeric, 2) AS aed
FROM ops.claude_api_calls
WHERE called_at >= NOW() - INTERVAL '30 days'
GROUP BY workflow_name
ORDER BY aed DESC NULLS LAST;
```
Visualisation: **Bar chart**.

**Q12: Cost per booked discovery call (rolling 30 days)**
```sql
WITH spend AS (
  SELECT ROUND(SUM(cost_aed)::numeric, 2) AS aed
  FROM ops.claude_api_calls
  WHERE called_at >= NOW() - INTERVAL '30 days'
),
booked AS (
  SELECT COUNT(*) AS calls
  FROM raw.leads l
  JOIN raw.lead_pipeline_stages s ON s.id = l.lead_pipeline_stage_id
  WHERE s.name IN ('Discovery Booked', 'Demo Booked')
    AND l.updated_at >= NOW() - INTERVAL '30 days'
)
SELECT
  spend.aed AS stack_spend_aed,
  booked.calls AS calls_booked,
  CASE WHEN booked.calls > 0
       THEN ROUND(spend.aed / booked.calls, 2)
       ELSE NULL END AS aed_per_booked_call,
  200::numeric AS target_aed_per_call
FROM spend, booked;
```
Visualisation: **Number** (aed_per_booked_call), target 200, alert if > 500.

## Step 4 — Pin dashboards + share with the team

1. Each dashboard → **... → Move** → into a new collection called
   `Underwings KPIs`.
2. Mark each as **Official** (gold star).
3. **Admin → People → Invite people** → invite Nelson and Vinoth as
   members (not admins). They authenticate via Cloudflare Access first,
   then Metabase auto-creates their account.
4. Set **Default home page** for all users to the `Funnel` dashboard.

## Step 5 — Alerts

For Q10 (Claude API spend today) — when the number > 100:
- Dashboard tile → **... → Alerts → Create alert**
- Trigger: > 100
- Send to: founders' email distribution (or Slack when workspace exists)

For Q12 (cost per booked call) — alert if > 500:
- Same flow; daily check.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Warehouse` data source shows 0 tables | ETL hasn't run yet — manually trigger n8n workflow 13 in the n8n UI |
| Stage names in queries don't match | Update queries to use actual stage names from `docs/krayin-ids-reference.md` |
| `ops.claude_api_calls` empty | Workflows 02 and 05 need to log calls — to be added in Phase K continuous tuning (not P0 blocker) |
| Metabase shows "Your database is read-only" | Expected — we use a single user that owns the DB, but Metabase only ever reads. If write attempts appear in logs, that's a bug. |

## What's deliberately not here

- Saved questions for proposal-stage cohort analysis — Phase C (proposal generator)
- Subscription churn dashboard — Phase J
- Outbound reply-rate dashboard — Phase I
- Cohort retention dashboards — Phase E

Each will get its own SQL drop-in here as those phases ship.
