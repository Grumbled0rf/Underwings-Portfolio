-- ===========================================
-- MIGRATION 005: Leads module — admin UI backing tables
--
-- Adds:
--   1. resource_leads table (gated-download / whitepaper captures)
--   2. lead_status column on form_submissions, subscribers, waitlist_signups
--      with a CHECK constraint and index for fast filtering
--   3. RLS policies (admin-only via is_admin() from migration 002)
-- ===========================================

-- ===========================================
-- 1. resource_leads — gated downloads / whitepapers
-- ===========================================
CREATE TABLE IF NOT EXISTS public.resource_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT,
    company TEXT,
    role TEXT,
    resource_slug TEXT NOT NULL,    -- which downloadable they requested
    resource_title TEXT,            -- denormalised for admin UI
    ip_hash TEXT,
    user_agent TEXT,
    referer TEXT,
    consent_marketing BOOLEAN DEFAULT false,
    lead_status TEXT NOT NULL DEFAULT 'new'
      CHECK (lead_status IN ('new','reviewed','contacted','closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resource_leads_email     ON public.resource_leads(email);
CREATE INDEX IF NOT EXISTS idx_resource_leads_resource  ON public.resource_leads(resource_slug);
CREATE INDEX IF NOT EXISTS idx_resource_leads_status    ON public.resource_leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_resource_leads_created   ON public.resource_leads(created_at DESC);
ALTER TABLE public.resource_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit resource leads" ON public.resource_leads;
CREATE POLICY "Public can submit resource leads" ON public.resource_leads
    FOR INSERT WITH CHECK (lead_status = 'new');

DROP POLICY IF EXISTS "Admins can manage resource leads" ON public.resource_leads;
CREATE POLICY "Admins can manage resource leads" ON public.resource_leads
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- updated_at trigger
DROP TRIGGER IF EXISTS update_resource_leads_updated_at ON public.resource_leads;
CREATE TRIGGER update_resource_leads_updated_at
    BEFORE UPDATE ON public.resource_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 2. lead_status on existing lead-bearing tables
-- ===========================================

-- form_submissions: contact-form leads
ALTER TABLE public.form_submissions
    ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'
      CHECK (lead_status IN ('new','reviewed','contacted','closed')),
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_form_submissions_status  ON public.form_submissions(lead_status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type    ON public.form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON public.form_submissions(created_at DESC);

-- subscribers: newsletter
ALTER TABLE public.subscribers
    ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'
      CHECK (lead_status IN ('new','reviewed','contacted','closed')),
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_subscribers_status  ON public.subscribers(lead_status);
CREATE INDEX IF NOT EXISTS idx_subscribers_created ON public.subscribers(created_at DESC);

-- waitlist_signups: Coming Soon waitlist (created in migration 003)
ALTER TABLE public.waitlist_signups
    ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new'
      CHECK (lead_status IN ('new','reviewed','contacted','closed')),
    ADD COLUMN IF NOT EXISTS admin_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_waitlist_status   ON public.waitlist_signups(lead_status);
-- waitlist_signups uses captured_at (created in migration 003), not created_at

-- ===========================================
-- DONE
-- ===========================================
