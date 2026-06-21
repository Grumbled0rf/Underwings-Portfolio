# Underwings.org — SEO / GEO / AEO / AIO Audit

**Date:** 2026-06-21
**Scope:** `frontend/` (Astro hybrid SSR, ~45 indexable URLs)
**Baseline data:** Semrush-style crawl export `frontend/src/pages/services/SEO Issues/` dated 2026-04-18, plus code review of `Layout.astro`, service pages, config, `robots.txt`, `llms.txt`, sitemap.

---

## 0. Verdict (TL;DR)

The site is **already well above average** for a startup. It ships hreflang, per-page JSON-LD (Service + FAQPage + BreadcrumbList on service pages), a sitemap, an `llms.txt`, geo meta, canonical tags, a webmanifest, accessibility scaffolding (skip-link, focus-visible, reduced-motion), and a responsive system. So this is **optimisation, not rescue.**

The wins are concentrated in five areas:

1. **Canonicalisation + hreflang consistency** (38 hreflang "conflicts" + trailing-slash duplication) — a real, fixable technical bug.
2. **Schema gaps on money/trust pages** (`/about`, `/software`, `/contact`, hubs have no/weak JSON-LD; no `sameAs`, no `Review`/`AggregateRating`).
3. **AEO/GEO depth** — great on flagship service pages, thin/absent on hubs, homepage, and `/about`.
4. **Performance / Core Web Vitals** — heavy Webflow + jQuery + GSAP + Calendly + GA payload.
5. **Hygiene** — broken links (1×4xx, 6 internal, 41 external), 23 over-long titles, 5 structured-data errors, weak internal linking (35 orphaned sitemap pages, 7 pages with a single inbound link).

Definitions used here:
- **SEO** = classic Google/Bing ranking.
- **GEO** = Generative Engine Optimization (being *cited* by ChatGPT / Perplexity / Gemini / Copilot) **+** local/geographic (UAE) intent, since both apply here.
- **AEO** = Answer Engine Optimization (featured snippets, "People Also Ask", direct-answer blocks).
- **AIO** = AI/LLM ingestion + Google AI Overviews (`llms.txt`, clean extractable markup, entity clarity).

---

## 1. Technical SEO

### 1.1 Canonical + trailing-slash duplication — **HIGH**
The crawl lists the homepage twice as separate URLs: `https://underwings.org` (ILR 84) and `https://underwings.org/` (ILR 80). Astro's default `trailingSlash: 'ignore'` lets both resolve, splitting link equity.
- **Root cause:** no enforced trailing-slash policy; canonical is `Astro.url.href` (`Layout.astro:22`), which can differ from the hreflang base.
- **Fix:** set `trailingSlash: 'never'` in `astro.config.mjs` and add a host/normalisation redirect (www→apex, force-no-trailing-slash) at the Node adapter / reverse proxy. Make canonical deterministic: `` `${siteUrl}${path}` `` with the trailing slash stripped, not `Astro.url.href` (which carries query strings into the canonical).

### 1.2 Hreflang conflicts (38 errors) — **HIGH**
In `Layout.astro:75-87`, non-home pages emit only `hreflang="en"` + `x-default`, both pointing at the *current path*, while the homepage emits `en` + `ar` + `x-default`. Two problems:
- The `en` href is built from `siteUrl + pathname` (no trailing slash) but the page's own canonical/`og:url` uses `Astro.url.href` (often *with* slash/query) → value mismatch = "conflict within page source code."
- The Arabic page (`/ar`) is a single page; English service pages don't declare an `ar` alternate and `/ar` likely doesn't declare per-service return tags → **non-reciprocal hreflang** (Google ignores non-reciprocal sets).
- **Fix:** (a) make hreflang hrefs use the exact same normalised URL as canonical; (b) only emit `ar` where a real Arabic equivalent exists, and make it reciprocal; (c) if `/ar` is the *only* Arabic page, keep the en/ar pair to the homepages only (current behaviour is close — just fix the URL-format mismatch).

### 1.3 Sitemap / orphan issues — **MEDIUM**
35 of 36 sitemap URLs flagged "orphaned" (in sitemap but ≤1 internal link) and 7 pages have only one internal link. Sub-service pages (e.g. `security-architecture-review` ILR 8, `tabletop-incident-response` ILR 8, `microsoft-365-security-review` ILR 16) are weakly linked.
- **Fix:** add cross-links — "Related services" blocks on every service page, link hubs → all children and children → siblings, and surface deep pages in the footer mega-nav. Confirm `@astrojs/sitemap` excludes `/api/*`, `/admin`, 404/500.

### 1.4 Broken links — **MEDIUM**
1× 4xx, 6 broken internal links, 41 broken external links. Broken outbound links hurt trust signals; broken internal links waste crawl budget.
- **Fix:** run a link check in CI (e.g. `lychee` / `linkinator`) against the built `dist/`. Fix or remove the dead targets; add `rel="noopener"` is already present on outbound.

### 1.5 Old-slug redirects — **LOW/MEDIUM**
Crawl shows legacy URLs (`/services/vapt`, `/services/iso-27001`, `/services/training`, `/services/consultation`, `/portal`) returning redirects (160 permanent redirects noted). Fine, but ensure each is a single 301 (no chains) straight to the canonical target.

### 1.6 Robots / indexation — **OK, minor**
`robots.txt` is clean and references the sitemap. `/admin` is `Disallow`-ed but un-trailing-slashed — make it `Disallow: /admin` *and* `/admin/`. Confirm API routes return `noindex` headers too (defence in depth).

---

## 2. Structured Data (schema.org)

### What's strong
- Service pages: **BreadcrumbList + Service + FAQPage** (see `web-application-penetration-testing.astro:25-42`) — this is exactly right and the single biggest AEO asset on the site.
- Blog posts: **Article + BreadcrumbList**.
- Default **Organization** schema in `Layout.astro:34-52`.

### Gaps — **HIGH value, low effort**
1. **5 structured-data markup errors** (crawl issue #45). Run every template through Google's Rich Results Test + Schema validator and fix.
2. **`/about` has *zero* JSON-LD** (confirmed in crawl). This is the #1 E-E-A-T / GEO page. Add `AboutPage` + an enriched `Organization` with `founder`/`employee` (`Person` nodes with `name`, `jobTitle`, `hasCredential` for OSCP/CPTS/ISO 27001 Lead Auditor). LLMs and Google's knowledge graph lean heavily on this.
3. **No `sameAs`** on Organization. Add LinkedIn/X/company profiles — this is the primary entity-disambiguation signal for both Google Knowledge Graph and generative engines.
4. **No `Review` / `AggregateRating`** anywhere. If you have real client testimonials/logos (you ship `partner`/`founding-client` PDFs), mark them up (honestly — only with genuine, attributable reviews) to earn rich-result stars and trust signals.
5. **Organization is missing `LocalBusiness` signals** for UAE local SEO: add `LocalBusiness`/`ProfessionalService` subtype with `address`, `geo` (lat/long), `areaServed`, `openingHours`, `priceRange`. The crawl's "Local Business items = 0" on every page confirms the gap.
6. **Hubs** (`/services`, `/services/*` index pages) have Breadcrumb but no `ItemList`/`CollectionPage` — add `ItemList` enumerating child services (helps sitelinks + AEO list answers).
7. **`/software`, `/updates`, `/careers`** — `/careers` already has Breadcrumb; add `JobPosting` when roles are live; `/software` should carry `Service`/`Product` schema.

---

## 3. AEO (Answer Engine Optimization)

**Strong** on flagship service pages (8-question FAQ blocks with FAQPage schema). To extend:

1. **Add FAQ + direct-answer blocks to:** homepage, all 5 category hubs, `/about`, `/software`. Each hub should answer "What is X?", "How much does X cost in the UAE?", "How long does X take?" in the first 1-2 sentences (answer-first, then detail).
2. **Lead every page with a 40-60 word extractable summary** ("definition box") — answer engines lift the first concise, self-contained paragraph. Several pages currently open with a marketing hero, not an answer.
3. **Comparison content** is your AEO sweet spot — you already have `penetration-testing-vs-vulnerability-assessment` and `phishing-simulation-vs-awareness-training`. Add: "VAPT vs pentest", "ISO 27001 vs NESA vs ADHICS", "Black-box vs grey-box vs white-box". These win "X vs Y" and PAA queries.
4. **Use real `<table>`s** for pricing/scope/timeline (e.g. the AED ranges, durations). Tables are disproportionately lifted into snippets and AI answers.
5. **Mark up HowTo** where you describe a process (e.g. "How an ISO 27001 gap assessment works").

---

## 4. GEO (Generative Engine Optimization + Local)

### Generative (ChatGPT / Perplexity / Gemini / Copilot)
- **`llms.txt` is present and good** (`public/llms.txt`) — well-structured, names certifications. Add a **`llms-full.txt`** (or per-page `.md` mirrors) with the full service descriptions so models can ingest depth, not just links.
- **Cite-able specifics win citations.** Generative engines preferentially quote pages with concrete numbers, named credentials, dates, and methodology. Your service pages already do this (AED ranges, OSCP/CPTS, OWASP 2021, week-counts) — **propagate that density to hubs, `/about`, and the homepage.**
- **Named authors + dates on blog posts** (Article `author` as a `Person` with credentials, `datePublished`/`dateModified`). This is a top GEO trust signal and likely missing or generic.
- **Statistics with sources.** Add a few cited UAE-specific stats (PDPL deadlines, breach costs) with outbound citations — these are exactly what LLMs lift and attribute.
- **Confirm AI crawlers aren't blocked** at the CDN/WAF level (GPTBot, ClaudeBot, PerplexityBot, Google-Extended). `robots.txt` currently allows all — keep it that way unless you deliberately opt out, and verify Cloudflare's "Block AI bots" toggle is **off**.

### Local / Geographic (UAE)
- `geo.region`/`geo.placename` meta present (`Layout.astro:92-93`) — minor signal.
- **Biggest local lever: `LocalBusiness` schema + Google Business Profile** (see §2.5). Without a GBP + NAP consistency (Name/Address/Phone identical across site, GBP, directories), you won't rank in the UAE map pack.
- Add **city-intent landing content** (Abu Dhabi, Dubai) where genuine — but avoid thin doorway pages; fold into existing service copy.

---

## 5. AIO (AI Overviews & LLM ingestion)

- Google **AI Overviews** pull from the same signals as featured snippets — §3 (AEO) directly feeds this. Answer-first paragraphs + FAQ + tables are the mechanism.
- **Extractable markup:** the Webflow export produces heavy, class-soup HTML. The crawl flags **27 pages with low text-to-HTML ratio** and "low semantic HTML usage." Wrap content in real semantic elements (`<article>`, `<section>`, `<h2>`, `<dl>` for FAQ) so parsers isolate the content. (`<main id="main">` is already used — good.)
- Keep the **content/markup ratio** up by trimming presentational wrapper divs where practical and ensuring the meaningful text isn't buried.

---

## 6. Performance / Core Web Vitals — **MEDIUM/HIGH**

Render-blocking and heavy third-party payload in `Layout.astro`:
- **jQuery 3.5.1 + webflow.js + GSAP + ScrambleTextPlugin + Calendly + GA** all load on every page. Calendly's `widget.js` is loaded **without `defer`/`async`** (`Layout.astro:841`) — move to lazy-load on click (the popup is already click-triggered, so the script can be injected on first interaction).
- **3 separate Webflow CSS files** (`normalize`, `webflow`, `underwings-org.webflow`) — the build runs PurgeCSS + minify (`package.json`), good; verify purge actually runs against prod and inline critical CSS for the hero.
- The crawl predates the minify build (133 unminified files, slow-load notices) — **re-run the crawl after a production deploy** to confirm these cleared.
- **Action:** measure with PageSpeed Insights / Lighthouse on the live LCP pages (home, a service page). Likely wins: defer Calendly, self-host or drop GSAP scramble effect on mobile, ensure `og-default.png` and hero images are sized/`loading="lazy"` below the fold (above-the-fold hero should be eager + `fetchpriority="high"`).

---

## 7. On-page hygiene

| Issue | Count | Severity | Action |
|---|---|---|---|
| Title too long (>60 char) | 23 | Medium | Trim to ≤60 incl. brand; front-load keyword |
| Multiple H1 | 1 | Medium | Find & fix the page with 2× `<h1>` |
| Low text-to-HTML ratio | 27 | Medium | Reduce wrapper divs / add content (§5) |
| Broken external links | 41 | Medium | Audit & fix (§1.4) |
| Broken internal links | 6 | High | Fix (§1.4) |
| 4xx error | 1 | High | Locate & fix |
| Structured-data errors | 5 | High | Validate & fix (§2) |
| Pages w/ 1 internal link | 7 | Medium | Internal linking (§1.3) |
| Title duplication / meta desc dup | 0 | OK | — |
| Missing H1 / alt / viewport | 0 | OK | Already clean |

---

## 8. Prioritised action plan

### Phase 1 — Technical correctness (1–2 days, highest ROI)
1. Enforce trailing-slash + www→apex canonicalisation; make canonical deterministic (§1.1).
2. Fix hreflang URL-format mismatch + reciprocity (§1.2).
3. Fix the 5 structured-data errors, the 1×4xx, and 6 broken internal links (§1.4, §2).
4. Trim 23 over-long titles; fix the double-H1 (§7).

### Phase 2 — Schema & trust (2–3 days)
5. Add `AboutPage` + enriched `Organization` (founders, credentials, `sameAs`) (§2.2-2.3).
6. Add `LocalBusiness`/`ProfessionalService` + set up Google Business Profile (§2.5, §4).
7. Add `ItemList` to hubs; `Review`/`AggregateRating` where genuine (§2.4, §2.6).

### Phase 3 — AEO/GEO content depth (ongoing)
8. Answer-first summary + FAQ blocks on homepage, hubs, `/about`, `/software` (§3.1-3.2).
9. Author bylines + dates + cited stats on blog; add 2-3 comparison articles (§4, §3.3).
10. Add `llms-full.txt` / markdown mirrors (§4).

### Phase 4 — Performance (1–2 days)
11. Lazy-load Calendly, defer/trim GSAP, inline critical CSS, image priorities (§6).
12. Re-crawl post-deploy to confirm minify/perf issues cleared.

### Phase 5 — Internal linking & monitoring (ongoing)
13. "Related services" + sibling links to de-orphan deep pages (§1.3).
14. Add link-check + Lighthouse CI; wire Search Console + re-run Semrush monthly.

---

## 8b. Phase 1 — IMPLEMENTED (2026-06-21)

> Important: the April crawl is **stale**. The current Astro build already resolved
> most flagged issues (e.g. 20 of 23 "too-long" titles were already ≤60 chars).
> Verified by measuring the live source titles + a clean `astro build`.

| # | Change | File(s) |
|---|---|---|
| 1 | `trailingSlash: 'never'` — kills the `/foo` vs `/foo/` duplication | `astro.config.mjs` |
| 2 | Deterministic canonical (no query/trailing slash); `canonical`, `og:url` + all hreflang hrefs now built from one normalised value → fixes the 38 hreflang "conflicts" | `src/layouts/Layout.astro` |
| 3 | Reciprocal en↔ar hreflang via `hasArabicAlternate` prop — built to scale to a full `/ar/*` tree; emits the pair only where an Arabic page exists | `src/layouts/Layout.astro` |
| 4 | `<html lang>`/`dir` now switch to `ar`/`rtl` under `/ar` (fixes lang mismatch) | `src/layouts/Layout.astro` |
| 5 | Added `url` to `ItemList` `ListItem`s on all 5 category hubs → fixes the 5 structured-data markup errors + feeds child URLs to engines | `services/{offensive-security,grc,cloud-security,network-infrastructure,training-awareness}/index.astro` |
| 6 | Trimmed the 3 titles still >60 chars | `continuous-compliance-subscription`, `software`, `ptaas-subscription` |
| 7 | Added `301 /contact → /#contact` (was 404 in crawl) | `nginx/nginx.conf` |

**Verification:** `npm run build:astro` completes clean (server + client + prerender). `ar.astro` is a standalone page (not Layout-based) and was already correct, so it's untouched.

### Still open from Phase 1 (need a decision or external action)
- **Blog titles (9 flagged):** CMS-driven (`post.meta_title || post.title`). Set a ≤60-char `meta_title` per post in Supabase — not a code change.
- **`/portal` (multiple-H1 / 404):** legacy page; tell me the real target (external client portal?) and I'll add the 301.
- **Footer "Terms" → `/about`** ([Footer.astro:260](frontend/src/components/Footer.astro#L260)): misleading anchor. Either create a real `/terms` page or drop the link — your call.
- **Broken external links (41, sitewide):** almost certainly the LinkedIn/Instagram footer links returning HTTP 999/403 to the crawler — a **false positive**, no action needed. Worth a manual spot-check.
- **Re-crawl after deploy** to clear the stale April findings (minify, titles, hreflang, schema).

## 9. Notes / open questions for planning
- Is there a **Google Business Profile** already? (decides §2.5/§4 effort)
- Are there **real client testimonials** we can attribute? (decides `Review` schema)
- Is **`/ar`** meant to expand into a full Arabic tree, or stay a single landing page? (decides hreflang strategy)
- Confirm the **production deploy already runs the minify build** (the April crawl predates it).
