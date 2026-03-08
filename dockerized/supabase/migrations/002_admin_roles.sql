-- ===========================================
-- MIGRATION: Admin role-based RLS
-- Replaces bare 'authenticated' checks with admin_users table
-- ===========================================

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Admins can view admin users" ON public.admin_users
    FOR SELECT USING (auth.uid() IN (SELECT au.id FROM public.admin_users au));

-- Helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update all admin policies to use is_admin()

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

-- Client portal tables
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
-- IMPORTANT: After running this migration, add your admin user:
-- INSERT INTO public.admin_users (id) VALUES ('<your-auth-user-uuid>');
-- ===========================================
