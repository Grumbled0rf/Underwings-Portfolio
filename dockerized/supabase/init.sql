-- ===========================================
-- UNDERWINGS DATABASE INITIALIZATION
-- Custom tables only - Supabase handles core setup
-- ===========================================

-- ===========================================
-- BLOG POSTS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image TEXT,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    meta_title TEXT,
    meta_description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    author_id UUID,
    author_name TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- ===========================================
-- BLOG CATEGORIES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
    ('Cybersecurity', 'cybersecurity', 'General cybersecurity topics and news'),
    ('Compliance', 'compliance', 'ISO 27001, SOC 2, PCI DSS, and other compliance frameworks'),
    ('Penetration Testing', 'penetration-testing', 'VAPT, ethical hacking, and security assessments'),
    ('Training', 'training', 'Security awareness and training resources'),
    ('Industry News', 'industry-news', 'Latest news and updates from the security industry')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- FORM SUBMISSIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_type TEXT NOT NULL CHECK (form_type IN ('contact', 'quote', 'newsletter', 'consultation')),
    name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    message TEXT,
    service_interest TEXT,
    budget_range TEXT,
    timeline TEXT,
    how_heard TEXT,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived', 'spam')),
    notes TEXT,
    assigned_to UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_type ON public.form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON public.form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON public.form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_email ON public.form_submissions(email);

-- ===========================================
-- NEWSLETTER SUBSCRIBERS TABLE
-- ===========================================
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON public.subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_subscribed ON public.subscribers(subscribed);

-- ===========================================
-- SITE SETTINGS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.site_settings (key, value) VALUES
    ('site_title', '"Underwings Technologies"'),
    ('site_description', '"Cybersecurity Solutions Provider"'),
    ('contact_email', '"contact@underwings.org"'),
    ('social_links', '{"linkedin": "https://www.linkedin.com/company/underwings-technologies", "twitter": "", "github": ""}'),
    ('notification_emails', '["admin@underwings.org"]')
ON CONFLICT (key) DO NOTHING;

-- ===========================================
-- ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Blog Posts Policies
DROP POLICY IF EXISTS "Public can read published posts" ON public.blog_posts;
CREATE POLICY "Public can read published posts" ON public.blog_posts
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Authenticated users can manage posts" ON public.blog_posts;
CREATE POLICY "Authenticated users can manage posts" ON public.blog_posts
    FOR ALL USING (auth.role() = 'authenticated');

-- Blog Categories Policies
DROP POLICY IF EXISTS "Public can read categories" ON public.blog_categories;
CREATE POLICY "Public can read categories" ON public.blog_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.blog_categories;
CREATE POLICY "Authenticated users can manage categories" ON public.blog_categories
    FOR ALL USING (auth.role() = 'authenticated');

-- Form Submissions Policies
DROP POLICY IF EXISTS "Public can submit forms" ON public.form_submissions;
CREATE POLICY "Public can submit forms" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.form_submissions;
CREATE POLICY "Authenticated users can view submissions" ON public.form_submissions
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update submissions" ON public.form_submissions;
CREATE POLICY "Authenticated users can update submissions" ON public.form_submissions
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Subscribers Policies
DROP POLICY IF EXISTS "Public can subscribe" ON public.subscribers;
CREATE POLICY "Public can subscribe" ON public.subscribers
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage subscribers" ON public.subscribers;
CREATE POLICY "Authenticated users can manage subscribers" ON public.subscribers
    FOR ALL USING (auth.role() = 'authenticated');

-- Site Settings Policies
DROP POLICY IF EXISTS "Public can read settings" ON public.site_settings;
CREATE POLICY "Public can read settings" ON public.site_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage settings" ON public.site_settings;
CREATE POLICY "Authenticated users can manage settings" ON public.site_settings
    FOR ALL USING (auth.role() = 'authenticated');

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_form_submissions_updated_at ON public.form_submissions;
CREATE TRIGGER update_form_submissions_updated_at
    BEFORE UPDATE ON public.form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- SAMPLE DATA
-- ===========================================

-- Sample blog post
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, status, author_name, published_at) VALUES
(
    'Understanding ISO 27001 Certification',
    'understanding-iso-27001-certification',
    'A comprehensive guide to ISO 27001 certification and its benefits for your organization.',
    '## What is ISO 27001?

ISO 27001 is the international standard for information security management systems (ISMS). It provides a framework for organizations to manage their information security risks effectively.

### Key Benefits

1. **Enhanced Security Posture** - Systematic approach to managing sensitive information
2. **Regulatory Compliance** - Meets various regulatory requirements
3. **Customer Trust** - Demonstrates commitment to security
4. **Risk Management** - Identifies and addresses security risks

### Implementation Steps

1. Gap Analysis
2. Risk Assessment
3. Policy Development
4. Implementation
5. Internal Audit
6. Certification Audit

Contact us to learn how we can help you achieve ISO 27001 certification.',
    'Compliance',
    'published',
    'Underwings Team',
    NOW()
)
ON CONFLICT (slug) DO NOTHING;
