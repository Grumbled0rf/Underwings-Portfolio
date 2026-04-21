-- ============================================================
-- Migration 004 — blog_posts.meta_title seeds
-- meta_title column already exists on blog_posts.
-- Seed shorter SEO titles for 6 posts whose display title
-- exceeds the 60-char SEO limit after the " | Underwings" suffix.
--
-- The blog template (frontend/src/pages/blog/[slug].astro)
-- uses meta_title when set, else falls back to `${title} | Underwings`.
-- ============================================================

UPDATE public.blog_posts SET meta_title = 'Pen Test vs Vulnerability Assessment UAE | Underwings'
  WHERE slug = 'penetration-testing-vs-vulnerability-assessment-uae';

UPDATE public.blog_posts SET meta_title = 'Phishing Simulation vs Awareness Training | Underwings'
  WHERE slug = 'phishing-simulation-vs-awareness-training-uae';

UPDATE public.blog_posts SET meta_title = 'VAPT Explained for UAE Business Owners | Underwings'
  WHERE slug = 'vapt-explained-what-uae-business-owners-should-know';

UPDATE public.blog_posts SET meta_title = 'Top 5 Cybersecurity Threats Facing UAE SMEs | Underwings'
  WHERE slug = 'top-5-cybersecurity-threats-facing-uae-smes';

UPDATE public.blog_posts SET meta_title = 'UAE PDPL Compliance Checklist 2026 | Underwings'
  WHERE slug = 'uae-pdpl-compliance-checklist-2026';

UPDATE public.blog_posts SET meta_title = 'NESA / UAE IA V2 Explained | Underwings'
  WHERE slug = 'nesa-uae-ia-v2-in-plain-english';
