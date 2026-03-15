-- ===========================================
-- MIGRATION: Create missing tables + admin role-based RLS
-- Run against: underwings database
-- ===========================================

-- ===========================================
-- 1. CREATE MISSING TABLES
-- ===========================================

-- Ensure pgcrypto is available for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Subscribers
CREATE TABLE IF NOT EXISTS public.subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    subscribed BOOLEAN DEFAULT true,
    subscription_source TEXT DEFAULT 'website',
    confirmed BOOLEAN DEFAULT false,
    confirm_token TEXT,
    unsubscribe_token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed ON public.subscribers(subscribed);
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Public subscribe policy
DROP POLICY IF EXISTS "Public can subscribe" ON public.subscribers;
CREATE POLICY "Public can subscribe" ON public.subscribers
    FOR INSERT WITH CHECK (
        subscribed = true
        AND confirmed = false
        AND confirmed_at IS NULL
        AND unsubscribed_at IS NULL
    );

-- Site Settings
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings" ON public.site_settings
    FOR SELECT USING (true);

INSERT INTO public.site_settings (key, value) VALUES
    ('site_title', '"Underwings Cybersecurity Solutions"'),
    ('site_description', '"Cybersecurity Solutions Provider"'),
    ('contact_email', '"contact@underwings.org"'),
    ('social_links', '{"linkedin": "https://www.linkedin.com/company/underwings-technologies", "twitter": "", "github": ""}'),
    ('notification_emails', '["admin@underwings.org"]')
ON CONFLICT (key) DO NOTHING;

-- Career Openings
CREATE TABLE IF NOT EXISTS public.career_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'future' CHECK (status IN ('active', 'future', 'closed')),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_career_openings_status ON public.career_openings(status);
CREATE INDEX IF NOT EXISTS idx_career_openings_order ON public.career_openings(display_order);
ALTER TABLE public.career_openings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read open careers" ON public.career_openings;
CREATE POLICY "Public can read open careers" ON public.career_openings
    FOR SELECT USING (status IN ('active', 'future'));

-- Seed career openings
INSERT INTO public.career_openings (title, location, description, requirements, status, display_order) VALUES
    ('Senior Penetration Tester', 'UAE / Remote', 'Lead web, network, and cloud penetration testing engagements. Write detailed technical reports and mentor junior testers.', ARRAY['OSCP / CPTS preferred', '3+ years pentesting experience', 'Web, network & cloud testing', 'Strong report writing skills'], 'future', 1),
    ('Security Consultant', 'India / UAE', 'Help clients achieve and maintain ISO 27001 certification. Conduct gap assessments, build policies, and guide teams through compliance frameworks.', ARRAY['ISO 27001 Lead Implementer / Auditor', 'Compliance frameworks (SOC 2, PCI DSS)', 'Client-facing communication', 'Risk assessment methodology'], 'future', 2),
    ('Full-Stack Developer', 'Remote', 'Build internal security tools and client-facing platforms. Work with Astro, React, Node.js, and integrate with security APIs.', ARRAY['Astro / React experience', 'Node.js & REST APIs', 'Interest in security tooling', 'Self-directed & autonomous'], 'future', 3),
    ('Sales & Partnerships', 'UAE', 'Drive B2B cybersecurity sales across the GCC region. Build relationships with CISOs, CTOs, and IT decision-makers.', ARRAY['B2B cybersecurity sales', 'Relationship building', 'Understanding of security services', 'GCC market experience preferred'], 'future', 4)
ON CONFLICT DO NOTHING;

-- Client Projects
CREATE TABLE IF NOT EXISTS public.client_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id),
    project_name TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN ('vapt', 'iso-27001', 'training', 'consultation')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('scoping', 'in_progress', 'review', 'completed', 'retesting')),
    start_date DATE,
    target_end_date DATE,
    completed_date DATE,
    scope_summary TEXT,
    findings_critical INTEGER DEFAULT 0,
    findings_high INTEGER DEFAULT 0,
    findings_medium INTEGER DEFAULT 0,
    findings_low INTEGER DEFAULT 0,
    findings_info INTEGER DEFAULT 0,
    remediation_progress INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_projects_client_id ON public.client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_status ON public.client_projects(status);
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own projects" ON public.client_projects;
CREATE POLICY "Clients can view own projects" ON public.client_projects
    FOR SELECT USING (client_id = auth.uid());

-- Client Reports
CREATE TABLE IF NOT EXISTS public.client_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.client_projects(id) ON DELETE CASCADE,
    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('initial', 'retest', 'executive_summary', 'remediation_guide')),
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    downloaded_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_client_reports_project_id ON public.client_reports(project_id);
ALTER TABLE public.client_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own reports" ON public.client_reports;
CREATE POLICY "Clients can view own reports" ON public.client_reports
    FOR SELECT USING (
        project_id IN (SELECT id FROM public.client_projects WHERE client_id = auth.uid())
    );

-- Client Remediation
CREATE TABLE IF NOT EXISTS public.client_remediation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.client_projects(id) ON DELETE CASCADE,
    finding_title TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'accepted_risk')),
    description TEXT,
    recommendation TEXT,
    client_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_client_remediation_project_id ON public.client_remediation(project_id);
CREATE INDEX IF NOT EXISTS idx_client_remediation_severity ON public.client_remediation(severity);
ALTER TABLE public.client_remediation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own remediation" ON public.client_remediation;
CREATE POLICY "Clients can view own remediation" ON public.client_remediation
    FOR SELECT USING (
        project_id IN (SELECT id FROM public.client_projects WHERE client_id = auth.uid())
    );

DROP POLICY IF EXISTS "Clients can update own remediation notes" ON public.client_remediation;
CREATE POLICY "Clients can update own remediation notes" ON public.client_remediation
    FOR UPDATE USING (
        project_id IN (SELECT id FROM public.client_projects WHERE client_id = auth.uid())
    ) WITH CHECK (
        project_id IN (SELECT id FROM public.client_projects WHERE client_id = auth.uid())
    );

-- Updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_career_openings_updated_at ON public.career_openings;
CREATE TRIGGER update_career_openings_updated_at
    BEFORE UPDATE ON public.career_openings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_projects_updated_at ON public.client_projects;
CREATE TRIGGER update_client_projects_updated_at
    BEFORE UPDATE ON public.client_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_remediation_updated_at ON public.client_remediation;
CREATE TRIGGER update_client_remediation_updated_at
    BEFORE UPDATE ON public.client_remediation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 2. ADMIN USERS TABLE & HELPER FUNCTION
-- ===========================================

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users" ON public.admin_users
    FOR SELECT USING (auth.uid() IN (SELECT au.id FROM public.admin_users au));

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===========================================
-- 3. UPDATE ALL ADMIN POLICIES TO USE is_admin()
-- ===========================================

-- Blog posts
DROP POLICY IF EXISTS "Authenticated users can manage posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage posts" ON public.blog_posts;
CREATE POLICY "Admins can manage posts" ON public.blog_posts
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Blog categories
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.blog_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.blog_categories;
CREATE POLICY "Admins can manage categories" ON public.blog_categories
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Form submissions
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Authenticated users can update submissions" ON public.form_submissions;
DROP POLICY IF EXISTS "Admins can manage submissions" ON public.form_submissions;
CREATE POLICY "Admins can manage submissions" ON public.form_submissions
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Subscribers
DROP POLICY IF EXISTS "Authenticated users can manage subscribers" ON public.subscribers;
DROP POLICY IF EXISTS "Admins can manage subscribers" ON public.subscribers;
CREATE POLICY "Admins can manage subscribers" ON public.subscribers
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Site settings
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Partners
DROP POLICY IF EXISTS "Authenticated users can manage partners" ON public.partners;
DROP POLICY IF EXISTS "Admins can manage partners" ON public.partners;
CREATE POLICY "Admins can manage partners" ON public.partners
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Career openings
DROP POLICY IF EXISTS "Authenticated users can manage careers" ON public.career_openings;
DROP POLICY IF EXISTS "Admins can manage careers" ON public.career_openings;
CREATE POLICY "Admins can manage careers" ON public.career_openings
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Client portal
DROP POLICY IF EXISTS "Admins can manage client projects" ON public.client_projects;
CREATE POLICY "Admins can manage client projects" ON public.client_projects
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage client reports" ON public.client_reports;
CREATE POLICY "Admins can manage client reports" ON public.client_reports
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage client remediation" ON public.client_remediation;
CREATE POLICY "Admins can manage client remediation" ON public.client_remediation
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ===========================================
-- DONE. Now add yourself as admin:
-- INSERT INTO public.admin_users (id) VALUES ('<your-auth-user-uuid>');
--
-- To find your user UUID:
-- SELECT id, email FROM auth.users;
-- ===========================================
