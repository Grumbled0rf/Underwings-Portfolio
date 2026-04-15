-- ============================================================
-- Migration 003 — waitlist_signups
-- Captures email signups for Y2/Y3 services marked "Coming Soon"
-- on category hub pages. Used to measure demand before
-- committing to service rollout.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id                      uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  service_slug            text         NOT NULL,
  service_year            text,
  email                   text         NOT NULL,
  name                    text,
  company                 text,
  source_page             text,
  user_agent              text,
  ip_hash                 text,
  captured_at             timestamptz  NOT NULL DEFAULT now(),
  synced_to_listmonk_at   timestamptz,
  listmonk_list_id        integer,
  metadata                jsonb        DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_waitlist_service_captured
  ON public.waitlist_signups (service_slug, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_waitlist_email
  ON public.waitlist_signups (email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_service_email_unique
  ON public.waitlist_signups (service_slug, lower(email));

CREATE INDEX IF NOT EXISTS idx_waitlist_captured_at
  ON public.waitlist_signups (captured_at DESC);

-- Row Level Security
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Public can insert (anon, authenticated, and service_role via API) — content validated at API layer
DROP POLICY IF EXISTS waitlist_insert_public ON public.waitlist_signups;
CREATE POLICY waitlist_insert_public
  ON public.waitlist_signups
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Authenticated admin can read all (admin dashboard)
DROP POLICY IF EXISTS waitlist_select_authenticated ON public.waitlist_signups;
CREATE POLICY waitlist_select_authenticated
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can update/delete (admin cleanup)
DROP POLICY IF EXISTS waitlist_update_service_role ON public.waitlist_signups;
CREATE POLICY waitlist_update_service_role
  ON public.waitlist_signups
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS waitlist_delete_service_role ON public.waitlist_signups;
CREATE POLICY waitlist_delete_service_role
  ON public.waitlist_signups
  FOR DELETE
  TO service_role
  USING (true);

-- Helper view for admin dashboard — counts by service
CREATE OR REPLACE VIEW public.waitlist_counts AS
SELECT
  service_slug,
  COUNT(*)                                          AS total_signups,
  COUNT(*) FILTER (WHERE captured_at > now() - interval '30 days')  AS last_30d,
  COUNT(*) FILTER (WHERE captured_at > now() - interval '7 days')   AS last_7d,
  MAX(captured_at)                                  AS latest_signup
FROM public.waitlist_signups
GROUP BY service_slug
ORDER BY total_signups DESC;

GRANT SELECT ON public.waitlist_counts TO authenticated;

COMMENT ON TABLE  public.waitlist_signups IS 'Waitlist signups for Y2/Y3 Coming Soon services shown on category hub pages.';
COMMENT ON COLUMN public.waitlist_signups.service_slug IS 'Service identifier (e.g., red-team-exercises, iso-27701).';
COMMENT ON COLUMN public.waitlist_signups.service_year IS 'Target launch year ("2027" or "2028").';
COMMENT ON COLUMN public.waitlist_signups.ip_hash IS 'SHA-256 hash of client IP — never store raw IP.';
