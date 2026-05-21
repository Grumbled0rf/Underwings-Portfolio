-- Sales warehouse schema (idempotent — safe to re-run).
-- Mirrors only the Krayin tables we actually need for KPIs.
-- Aggregates are computed by nightly ETL (n8n workflow 13-warehouse-export).

\connect warehouse

CREATE SCHEMA IF NOT EXISTS raw;       -- mirrored Krayin tables (1:1)
CREATE SCHEMA IF NOT EXISTS analytics; -- computed marts (funnel, channel, velocity)
CREATE SCHEMA IF NOT EXISTS ops;       -- ETL run log + spend tracking

-- ─────────────────────────────────────────────────────────────
-- raw: 1:1 mirror of Krayin tables we care about
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS raw.leads (
  id                 BIGINT PRIMARY KEY,
  title              TEXT,
  description        TEXT,
  lead_value         NUMERIC,
  status             INTEGER,           -- 1=open, 0=closed
  lost_reason        TEXT,
  closed_at          TIMESTAMPTZ,
  expected_close_date DATE,
  lead_pipeline_id   INTEGER,
  lead_pipeline_stage_id INTEGER,
  lead_source_id     INTEGER,
  lead_type_id       INTEGER,
  user_id            INTEGER,           -- assigned principal
  person_id          INTEGER,
  organization_id    INTEGER,
  icp_segment        TEXT,              -- custom field
  outbound_confidence_score INTEGER,    -- custom field
  client_health_score INTEGER,          -- custom field
  created_at         TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ,
  synced_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS leads_pipeline_idx ON raw.leads (lead_pipeline_id);
CREATE INDEX IF NOT EXISTS leads_stage_idx    ON raw.leads (lead_pipeline_stage_id);
CREATE INDEX IF NOT EXISTS leads_source_idx   ON raw.leads (lead_source_id);
CREATE INDEX IF NOT EXISTS leads_created_idx  ON raw.leads (created_at);

CREATE TABLE IF NOT EXISTS raw.lead_pipelines (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  rotten_days INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.lead_pipeline_stages (
  id               INTEGER PRIMARY KEY,
  lead_pipeline_id INTEGER NOT NULL,
  name             TEXT    NOT NULL,
  sort_order       INTEGER,
  probability      INTEGER,
  created_at       TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.lead_sources (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.lead_types (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.users (
  id         INTEGER PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.persons (
  id              INTEGER PRIMARY KEY,
  name            TEXT,
  emails          TEXT,                 -- JSON in MariaDB; kept as TEXT here
  contact_numbers TEXT,
  organization_id INTEGER,
  created_at      TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw.organizations (
  id         INTEGER PRIMARY KEY,
  name       TEXT,
  created_at TIMESTAMPTZ,
  synced_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit trail: every stage transition we observe. Populated by the
-- nightly ETL diffing current state vs. last sync.
CREATE TABLE IF NOT EXISTS raw.stage_history (
  id              BIGSERIAL PRIMARY KEY,
  lead_id         BIGINT NOT NULL,
  from_stage_id   INTEGER,
  to_stage_id     INTEGER NOT NULL,
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stage_history_lead_idx ON raw.stage_history (lead_id);
CREATE INDEX IF NOT EXISTS stage_history_time_idx ON raw.stage_history (observed_at);

-- ─────────────────────────────────────────────────────────────
-- analytics: computed marts (refreshed by the same nightly ETL)
-- ─────────────────────────────────────────────────────────────

-- One row per day per pipeline; counts at each stage as of end-of-day Asia/Dubai
CREATE TABLE IF NOT EXISTS analytics.funnel_daily (
  snapshot_date    DATE NOT NULL,
  pipeline_id      INTEGER NOT NULL,
  pipeline_name    TEXT,
  stage_id         INTEGER NOT NULL,
  stage_name       TEXT,
  sort_order       INTEGER,
  lead_count       INTEGER NOT NULL,
  lead_value_sum   NUMERIC,
  PRIMARY KEY (snapshot_date, pipeline_id, stage_id)
);

-- One row per day per source: how many leads came in, how many became MQL+
CREATE TABLE IF NOT EXISTS analytics.channel_performance_daily (
  snapshot_date    DATE NOT NULL,
  source_id        INTEGER NOT NULL,
  source_name      TEXT,
  new_leads        INTEGER NOT NULL DEFAULT 0,
  mql_leads        INTEGER NOT NULL DEFAULT 0,
  booked_calls     INTEGER NOT NULL DEFAULT 0,
  proposals_sent   INTEGER NOT NULL DEFAULT 0,
  won_deals        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_date, source_id)
);

-- Stage velocity: average days a lead spent in each stage before moving on
-- Refreshed nightly from stage_history; rolling 90-day window
CREATE TABLE IF NOT EXISTS analytics.stage_velocity (
  pipeline_id      INTEGER NOT NULL,
  pipeline_name    TEXT,
  stage_id         INTEGER NOT NULL,
  stage_name       TEXT,
  median_days      NUMERIC,
  p90_days         NUMERIC,
  sample_size      INTEGER,
  computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pipeline_id, stage_id)
);

-- ─────────────────────────────────────────────────────────────
-- ops: ETL bookkeeping + spend tracking
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ops.etl_runs (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL,
  finished_at     TIMESTAMPTZ,
  rows_synced     INTEGER,
  status          TEXT,                 -- 'success', 'failed', 'partial'
  error_message   TEXT
);

-- Anthropic / Claude API spend, written by n8n on every API call.
-- Source of truth for the AED 100/day alert in master plan §11/9.
CREATE TABLE IF NOT EXISTS ops.claude_api_calls (
  id              BIGSERIAL PRIMARY KEY,
  called_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workflow_name   TEXT NOT NULL,        -- e.g. '02-lead-enrichment-scoring'
  model           TEXT NOT NULL,        -- 'claude-sonnet-4-6' etc.
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  cache_read_tokens INTEGER,
  cache_create_tokens INTEGER,
  cost_usd        NUMERIC(10, 4),
  cost_aed        NUMERIC(10, 4),       -- denormalised, ~3.67x USD
  related_lead_id BIGINT,               -- nullable
  notes           TEXT
);

CREATE INDEX IF NOT EXISTS claude_calls_time_idx ON ops.claude_api_calls (called_at);
CREATE INDEX IF NOT EXISTS claude_calls_workflow_idx ON ops.claude_api_calls (workflow_name);
