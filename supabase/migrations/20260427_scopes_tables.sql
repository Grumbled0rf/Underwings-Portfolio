CREATE TABLE IF NOT EXISTS scopes (
  id              BIGSERIAL PRIMARY KEY,
  token           VARCHAR(32) UNIQUE NOT NULL,
  reference       VARCHAR(20) UNIQUE NOT NULL,
  cart            JSONB NOT NULL,
  comments        JSONB NOT NULL DEFAULT '{}'::jsonb,
  founding_optin  BOOLEAN NOT NULL DEFAULT false,
  range_low       INTEGER NOT NULL,
  range_high      INTEGER NOT NULL,
  bundle_savings  TEXT,
  lead_name       VARCHAR(200) NOT NULL,
  lead_email      VARCHAR(200) NOT NULL,
  lead_company    VARCHAR(200) NOT NULL,
  lead_phone      VARCHAR(50),
  whatsapp_ok     BOOLEAN NOT NULL DEFAULT false,
  best_time       VARCHAR(20),
  krayin_lead_id  BIGINT,
  status          VARCHAR(20) NOT NULL DEFAULT 'submitted',
  pdf_path        TEXT,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scopes_token_idx ON scopes(token);
CREATE INDEX IF NOT EXISTS scopes_email_idx ON scopes(lead_email);
CREATE INDEX IF NOT EXISTS scopes_status_idx ON scopes(status);

CREATE TABLE IF NOT EXISTS scope_views (
  id          BIGSERIAL PRIMARY KEY,
  scope_id    BIGINT NOT NULL REFERENCES scopes(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip          INET,
  user_agent  TEXT,
  city        VARCHAR(100),
  country     VARCHAR(2),
  referer     TEXT
);

CREATE INDEX IF NOT EXISTS scope_views_scope_id_idx ON scope_views(scope_id);

-- daily reference counter sequence reset trigger
CREATE TABLE IF NOT EXISTS scope_reference_counter (
  day   DATE PRIMARY KEY,
  next  INTEGER NOT NULL DEFAULT 1
);

CREATE OR REPLACE FUNCTION next_scope_reference() RETURNS TEXT AS $$
DECLARE
  today DATE := CURRENT_DATE;
  n INTEGER;
BEGIN
  INSERT INTO scope_reference_counter(day, next) VALUES (today, 2)
    ON CONFLICT (day) DO UPDATE SET next = scope_reference_counter.next + 1
    RETURNING next - 1 INTO n;
  RETURN 'SCB-' || TO_CHAR(today, 'YYYY') || '-' || LPAD(n::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Secure-by-default: only service-role bypasses RLS, blocking anon/authenticated access
ALTER TABLE scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope_reference_counter ENABLE ROW LEVEL SECURITY;
