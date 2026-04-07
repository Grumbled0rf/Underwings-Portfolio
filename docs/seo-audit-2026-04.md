# SEO Audit — Underwings Website

**Ticket:** PRELAUNCH-8
**Auditor:** Gowtham
**Date:** 2026-04-07
**Branch:** `feat/seo-audit`
**Scope:** Static codebase audit of `frontend/` (Astro SSR app, source of truth per `docker-compose.yml`)
**Method:** Source-level inspection. Runtime checks (Lighthouse, Core Web Vitals) handled in the Performance phase of this ticket.

---

## 0. Executive Summary

The site has a **strong SEO foundation** thanks to a well-built shared `Layout.astro` that wires title, meta description, Open Graph, Twitter Card, canonical, hreflang, robots, JSON-LD, and viewport from props. **Image alt coverage is 100%.** Heading hierarchy is clean except on one page. Most issues are mid-priority polish (length tuning, schema gaps, breadcrumb staleness) rather than critical defects.

**Critical issues:** 2
**High issues:** 4
**Medium issues:** 8
**Low / polish:** 6

---

## 1. Critical Issues

### C1. Duplicate / divergent frontend trees: `frontend/` vs `dockerized/frontend/`
- The repo has two parallel Astro trees. `docker-compose.yml` builds from `./frontend`, so that is the live source.
- The most recent feature commit (`fcf8df9 feat: add services overview page`) added `services/index.astro` only to `frontend/`. The `dockerized/frontend/` tree is missing it and is **stale**.
- **Risk:** anyone editing `dockerized/frontend/` thinking it is the source will silently fail to ship. SEO findings could be invalidated if the wrong tree is shipped.
- **Fix:** Decide which tree is canonical, delete or archive the other, document in `README.md`. Out-of-scope for this ticket but **must be raised with the team**.

### C2. Arabic landing page (`/ar`) bypasses the shared Layout
- `frontend/src/pages/ar.astro` writes its own `<html>` / `<head>` / SEO tags inline instead of using `Layout.astro`.
- **Consequences:**
  - Any future change to `Layout.astro` (CSP nonce, new meta tags, schema fixes) will silently miss `/ar`.
  - `/ar` is missing the `hreflang="x-default"` link that `Layout.astro` emits (only `en` and `ar` are present).
  - `/ar` is missing the RSS `<link>` and several DNS prefetch entries.
  - JSON-LD on `/ar` is Organization only — no `BreadcrumbList`, no language-tagged Service.
- **Fix:** Refactor `ar.astro` to use `Layout.astro` with `lang="ar"` and `dir="rtl"` made into props on Layout. (Layout currently hard-codes `lang="en"`.)

---

## 2. High-Priority Issues

### H1. `Layout.astro` hard-codes `lang="en"`
- File: `frontend/src/layouts/Layout.astro:59`
- `<html lang="en" data-wf-page=...>` — no way to override for `/ar`. Forces `ar.astro` to bypass Layout (see C2).
- **Fix:** Add `lang` and `dir` props to `Layout.astro` defaulting to `"en"` / `"ltr"`.

### H2. Stale breadcrumbs in service detail pages
- Files: `services/vapt.astro:26`, `services/iso-27001.astro:25`, `services/consultation.astro:25`
- BreadcrumbList items point to `https://underwings.org/#services` (an anchor on the home page) — but `/services/` is now a real overview page (added in `fcf8df9`).
- **Fix:** Change the position-2 breadcrumb item URL to `https://underwings.org/services` (already correct in `services/training.astro`? — verify; in commit, training also uses `/#services` — same fix applies).
- **Verification needed:** Re-grep `/#services` after the fix to confirm zero remaining occurrences.

### H3. Pages explicitly opt out of all JSON-LD by passing `schema={null}`
- Files (8): `about.astro`, `404.astro`, `500.astro`, `portal.astro`, `privacy-policy.astro`, `brand.astro`, `updates.astro`, `[...slug].astro`
- `Layout.astro:54` treats `null` as "render no schema." These pages emit zero structured data — they don't even fall back to the default Organization schema.
- **High-value losses:**
  - `about.astro` should at minimum emit Organization + AboutPage + BreadcrumbList.
  - `brand.astro` should emit Organization (it is the brand page).
  - `updates.astro` should emit `CollectionPage` listing the news items.
  - `privacy-policy.astro` should emit Organization + WebPage.
- **Fix:** Replace `schema={null}` with appropriate schema arrays. For pages where you genuinely don't want schema (`404`, `500`, `portal`), keep `null` but document the reason in a comment.

### H4. `portal.astro` has two `<h1>` elements in the rendered DOM
- Lines 40 and 73 — one for the login screen, one for the logged-in dashboard. Both render in HTML; only one is visible at a time via JS.
- **SEO impact:** crawlers see two H1s on the same URL.
- **Fix:** Promote one to `<h1>` and demote the other to `<h2>`, or move the logged-in heading into a `<template>` rendered at runtime.

---

## 3. Medium-Priority Issues

### M1. Title length out of recommended 50–60 char range

| Page | Title length | Direction |
|---|---|---|
| `services/consultation` | **71** | over |
| `careers` | **67** | over |
| `services/vapt` | 60 | OK (edge) |
| `services/training` | 45 | under |
| `services/index` | 47 | under |
| `software` | 41 | under |
| `blog/index` | 41 | under |

**Fix examples:**
- consultation: `"Consultation & Advisory | Underwings Cybersecurity"` (50)
- careers: `"Cybersecurity Careers India & UAE | Underwings"` (47)
- software: `"Cybersecurity Software Sales & Implementation | Underwings"` (58)
- blog: `"Cybersecurity Insights & Resources | Underwings Blog"` (52)

### M2. Meta description length out of recommended 150–160 char range

13 of 18 pages are out of range. Most are over by 10–60 chars and get truncated in SERPs.

**Worst offenders (over):**
| Page | Length |
|---|---|
| `services/vapt` | **213** |
| `about` | **211** |
| `careers` | 197 |
| `services/iso-27001` | 197 |
| `services/training` | 197 |
| `services/consultation` | 191 |
| `blog/index` | 178 |
| `index` (homepage) | 175 |
| `services/index` | 174 |
| `updates` | 168 |
| `software` | 167 |
| `privacy-policy` | 161 |

**Under:**
| Page | Length |
|---|---|
| `404` | 138 |
| `[...slug]` | 138 |

**Fix:** Tighten each to 150–160 chars. Target 155 as the safe middle.

### M3. Duplicate title + description between `404.astro` and `[...slug].astro`
- Both routes use the identical title `"Page Not Found | Underwings Cybersecurity Solutions"` and the identical description.
- `[...slug].astro` correctly sets `Astro.response.status = 404`; `404.astro` does not (it relies on Astro's static 404 routing).
- **SEO impact:** low (both are noindex-equivalent due to status), but if either ever returns 200, you'd have duplicate-content twins.
- **Fix:** Confirm `404.astro` is reached only via the actual 404 path (it should be) and add `Astro.response.status = 404` to be explicit.

### M4. Five `<a href="#">` placeholders used as Calendly triggers
- Files: `Header.astro:65`, `Header.astro:117`, `services/consultation.astro:96, 309, 511`
- Pattern: `<a href="#" ... data-calendly-open>Book a Call</a>`
- **Issues:** crawlers follow them and land back on the same page (creates self-referential noise). Screen readers announce them as links. They should be buttons.
- **Fix:** Replace with `<button type="button" class="..." data-calendly-open>Book a Call</button>`. Style identically.

### M5. `<a href="/privacy-policy" target="_blank">` opens internal link in new tab
- File: `index.astro:1602`
- Internal links should not force a new tab; it disrupts navigation expectations and is a known a11y/SEO smell.
- **Fix:** Remove `target="_blank"`.

### M6. Default Layout `keywords` meta is set on every page
- `Layout.astro:23` defaults to a generic UAE-heavy keyword string. Most pages override it, but legacy `<meta name="keywords">` is **ignored by Google** since 2009 and treated as noise by some auditors.
- **Fix:** Remove the `keywords` prop and the `<meta name="keywords">` line entirely. Saves bytes, removes a maintenance burden.

### M7. Layout `wfPage` is leaking Webflow build IDs into production HTML
- `Layout.astro:24, 59` — `data-wf-page` and `data-wf-site` attributes are exported to crawlers.
- Not directly an SEO issue, but signals "this is a Webflow export" and looks unprofessional in view-source.
- **Fix (optional):** Strip if not needed for any runtime Webflow JS. Confirm with frontend lead.

### M8. Canonical defaults to `Astro.url.href` — includes query strings and trailing dots
- `Layout.astro:22` — `canonical = Astro.url.href`. For `/blog?page=2`, the canonical URL becomes `https://underwings.org/blog?page=2`. That is correct *for that page*, but it means the paginated blog pages canonicalize to themselves (good) and the non-paginated `/blog` canonicalizes to `/blog` (also good).
- **Latent risk:** If marketing tracking params like `?utm_source=...` are appended, the canonical will include them and split ranking signals.
- **Fix:** Strip query string from canonical unless explicitly opted in. Replace with `Astro.url.origin + Astro.url.pathname`.

---

## 4. Low / Polish Items

### L1. `robots.txt` references `/sitemap-index.xml` but the project uses `@astrojs/sitemap`
- File: `frontend/public/robots.txt:9`
- `@astrojs/sitemap` (configured in `astro.config.mjs:8,12`) generates `sitemap-index.xml` + `sitemap-0.xml` at build time. This is correct **after build**. Verify after `npm run build` that both files exist in `dist/`.
- **Action:** Add to runtime checklist — `curl -I https://underwings.org/sitemap-index.xml` should return 200.

### L2. `robots.txt` Disallow paths missing trailing slashes for some
- `Disallow: /admin` (no slash) — blocks `/admin` and `/admin-foo`. Probably intended.
- `Disallow: /supabase/` (slash) — blocks `/supabase/*` only.
- **Action:** Confirm intent on `/admin` — likely should be `/admin/`.

### L3. `Layout.astro` does not include `<meta name="theme-color">`
- Minor — improves mobile browser chrome on Android. Add: `<meta name="theme-color" content="#0d0d0d">` (or brand green).

### L4. Blog `[slug]` pages have no `og:type="article"`
- `blog/[slug].astro:78` — uses default Layout `og:type="website"`. Blog posts should be `og:type="article"`.
- **Fix:** Add an `ogType` prop to `Layout.astro` defaulting to `"website"`, override per-page.

### L5. Blog `[slug]` `articleSchema` is missing `image` when no `featured_image` exists
- `blog/[slug].astro:51` — `image: post.featured_image ? ... : undefined`. `undefined` is fine in JSON.stringify (omits the key), but Google's Article validator wants `image` present. Fall back to a sitewide hero image.

### L6. `services/vapt.astro` has 3 `<img>` tags in the body — one with `alt={title}` interpolated from blog data; pages otherwise rely on background-image divs. Verify no inline SVGs are missing `aria-hidden` or `<title>`.
- Spot-check passed; non-blocking.

---

## 5. Per-Page Title & Description Inventory

| Route | Title (chars) | Description (chars) | Schema | Notes |
|---|---|---|---|---|
| `/` | Underwings – Cybersecurity Solutions \| India & UAE (51) | 175 | Organization + Service | OK title, desc over |
| `/about` | About Underwings - Cybersecurity Company India & UAE (53) | **211** | **null (no schema)** | H3 |
| `/ar` | (Arabic, custom head) | (Arabic) | Organization only | C2 |
| `/blog` | Blog - Underwings Cybersecurity Solutions (41) | 178 | default Organization | M1, M2 |
| `/blog/[slug]` | {title} - Underwings Blog | dynamic | Article + BreadcrumbList | L4, L5 |
| `/brand` | Brand Guidelines \| Underwings Cybersecurity Solutions (53) | 153 | **null** | H3 |
| `/careers` | Careers – Join the Underwings Team \| Cybersecurity Jobs India & UAE (**67**) | 197 | BreadcrumbList | M1, M2 |
| `/portal` | Client Portal - Underwings Cybersecurity Solutions (51) | 154 | **null** | H4 (2 H1s), H3 |
| `/privacy-policy` | Privacy Policy \| Underwings Cybersecurity Solutions (51) | 161 | **null** | H3 |
| `/services/` | Services – Cybersecurity Solutions \| Underwings (47) | 174 | BreadcrumbList + ItemList | M1, M2 |
| `/services/vapt` | VAPT Services – Penetration Testing India & UAE \| Underwings (60) | **213** | Breadcrumb + Service + FAQPage | H2, M2 |
| `/services/iso-27001` | ISO 27001 Implementation & Certification \| Underwings (53) | 197 | Breadcrumb + Service + FAQPage | H2, M2 |
| `/services/consultation` | Consultation & Advisory – Strategic Cybersecurity Guidance \| Underwings (**71**) | 191 | Breadcrumb + Service + FAQPage | H2, M1, M2, M4 |
| `/services/training` | Cybersecurity Awareness Training \| Underwings (45) | 197 | Breadcrumb + Service + FAQPage | M1, M2 |
| `/software` | Cybersecurity Software Sales \| Underwings (41) | 167 | Service | M1, M2 |
| `/updates` | Cybersecurity News & Threat Intelligence \| Underwings (53) | 168 | **null** | H3, M2 |
| `/404` | Page Not Found \| Underwings Cybersecurity Solutions (52) | 138 | **null** | M3 |
| `/500` | Server Error \| Underwings Cybersecurity Solutions (49) | 159 | **null** | OK |
| `[...slug]` | Page Not Found \| Underwings Cybersecurity Solutions (52) | 138 | **null** | M3 |

---

## 6. Verified-Clean Items (no action needed)

✅ **Image `alt` coverage: 100%.** All 15 `<img>` tags across pages and components have non-empty alt attributes. Zero `alt=""`.
✅ **No `localhost` or `http://` (non-schema.org) URLs in source.**
✅ **`Layout.astro` includes:** `<title>`, `<meta description>`, `og:title`, `og:description`, `og:type`, `og:url`, `og:image` (1200×630), `og:locale`, `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `<link rel="canonical">`, `<meta name="robots" content="index, follow">`, `<meta name="viewport">`, `<link rel="alternate" hreflang>` for en/ar/x-default.
✅ **Default JSON-LD Organization** with Postal Address, ContactPoint, Logo on pages that don't override.
✅ **`@astrojs/sitemap` integration** is configured in `astro.config.mjs`.
✅ **`robots.txt` is present** with sitemap reference.
✅ **Heading hierarchy:** 18/19 pages have exactly one `<h1>`. Only `portal.astro` has two (H4).
✅ **Font preloading:** Geist 400/600 + Geist Mono 400 are preloaded in Layout.
✅ **DNS prefetch / preconnect** are in place for Calendly, Webflow CDN, HubSpot, Cloudfront.
✅ **No deprecated `http-equiv` refresh redirects.**

---

## 7. Recommended Fix Order

1. **Critical first** (separate PRs, smallest possible diffs):
   - C1: Investigate `dockerized/` duplication — get team consensus before deleting.
   - C2 + H1: Add `lang` / `dir` props to `Layout.astro`, then refactor `ar.astro` to use it.
2. **High** (single PR):
   - H2: Fix all 4 service-detail breadcrumbs (`/#services` → `/services`).
   - H3: Add appropriate schemas to about, brand, privacy-policy, updates.
   - H4: Fix `portal.astro` H1 duplication.
3. **Medium** (single PR):
   - M1 + M2: Tighten titles and descriptions per the table above.
   - M4: Convert 5 `<a href="#">` Calendly triggers to `<button>`.
   - M5: Remove `target="_blank"` from internal privacy-policy link.
   - M6: Remove `keywords` meta entirely.
   - M8: Strip query strings from canonical URLs.
3. **Polish** (low priority, can defer):
   - L1: Verify `sitemap-index.xml` after deploy.
   - L2: Decide on `/admin` vs `/admin/` in robots.txt.
   - L3: Add `theme-color` meta.
   - L4 + L5: Add `ogType` prop and image fallback in blog Article schema.
   - M7: Decide whether to strip Webflow data attributes.

---

## 8. Items Deferred to Performance Phase

- Lighthouse scores (Performance / A11y / Best Practices / SEO)
- Core Web Vitals (LCP / CLS / INP) measurement
- Bundle size analysis
- Image format audit (WebP / AVIF adoption, dimensions, lazy loading)
- Render-blocking resource analysis
- Cache-Control headers (nginx config)
- Real-network waterfall via WebPageTest
- Build-time sitemap-index.xml verification

These require a running build and a browser; they will be addressed in the second half of PRELAUNCH-8.

---

## 9. Tooling Notes

This audit was static (source-level). Before closing the ticket, also run:

- `npx lighthouse https://underwings.org --view` for each route in §5
- Google Rich Results Test on each route → verify Organization, Service, Article, BreadcrumbList, FAQPage all parse
- `curl -I https://underwings.org/robots.txt`, `…/sitemap-index.xml`, `…/sitemap-0.xml` → confirm 200
- `screaming-frog` crawl (free up to 500 URLs) → catches broken links + duplicate titles at runtime
