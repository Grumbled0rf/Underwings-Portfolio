# Spec — Ten Service Pages (Month-2 Rollout)

**Date:** 15 April 2026
**Author:** Manoj Prabhakaran (approved via delegation to Claude)
**Status:** Approved — implementation begins immediately
**Parent plan:** `docs/website-reconstruction-plan.md` (lean scope)

## Purpose

Build the 10 remaining Year-1 flagship service pages that were deferred in the lean launch (5 anchor pages shipped). Bring the website to "complete portfolio" state: every Year-1 flagship service has a dedicated, cert-backed, priced page that Google can index and a prospect can buy from.

## Scope

### In scope — the 10 pages

**Full-template (5,000 – 7,000-word pages, 6 total):**

| # | Service | Category | Lead | Price (AED) | Slug |
|---:|---|---|---|---|---|
| 1 | ISO 27001 Gap Assessment | GRC | Manoj | 20,000 – 40,000 | `iso-27001-gap-assessment` |
| 2 | UAE PDPL Compliance Advisory | GRC | Manoj | 15,000 – 35,000 | `uae-pdpl-advisory` |
| 3 | Web Application Penetration Testing | Offensive | Nelson | 15,000 – 40,000 | `web-application-penetration-testing` |
| 4 | NESA / UAE IA V2 Gap Assessment | GRC | Manoj | 20,000 – 50,000 | `nesa-uae-ia` |
| 5 | Risk Assessment & Risk Register Build | GRC | Manoj | 20,000 – 45,000 | `risk-assessment-register` |
| 6 | Security Architecture Review | Network & Infra | Vinoth | 15,000 – 35,000 | `security-architecture-review` |

**Lighter-template (~2,500-word pages, 4 total):**

| # | Service | Category | Lead | Price (AED) | Slug |
|---:|---|---|---|---|---|
| 7 | Microsoft 365 Security Review | Cloud | Vinoth | 10,000 – 25,000 | `microsoft-365-security-review` |
| 8 | Vulnerability Assessment (VA only) | Offensive | Nelson | 5,000 – 15,000 | `vulnerability-assessment` |
| 9 | Phishing Simulation & Social Engineering | Offensive | Nelson | 8,000 – 20,000 | `phishing-simulation` |
| 10 | Tabletop Incident Response Exercise | Training | Manoj | 8,000 – 20,000 | `tabletop-incident-response` |

### Explicit out-of-scope

- nginx 301 redirects for legacy URLs (deferred to end of Phase 4)
- Arabic translations
- One-pager PDF downloads
- Homepage further rewrites
- New components, design tokens, or layout changes
- Admin dashboard waitlist tile
- Blog content seeding

## Design

### Template patterns (locked)

**Full template sections** (matches existing 5 anchor pages):

1. Breadcrumb + Hero (H1, subhead, price / cert / time badges, primary + secondary CTA)
2. What it is (2 – 3 paragraphs)
3. What this is *not* (4-item grid, red-accented)
4. Who this is for (5 trigger scenarios)
5. What you get (6 – 8 deliverables bulleted)
6. How we deliver (process-timeline table with step numbers, durations, descriptions)
7. Pricing (range card + commercial terms card)
8. Cert-backed team (1 – 2 named practitioner cards)
9. FAQ (6 – 8 questions, accordion, FAQPage schema)
10. Related services (4-card grid, cross-sell)
11. Final CTA (scoping call block)

**Lighter template sections** (for services under AED 25k average):

1. Breadcrumb + Hero (same as full)
2. What it is (2 paragraphs, tighter)
3. Who this is for (3 triggers)
4. What you get (4 – 5 deliverables)
5. How we deliver (process timeline, 3 – 4 steps)
6. Pricing (single card, no separate terms card)
7. Cert-backed team (single lead block)
8. FAQ (3 – 4 questions, FAQPage schema)
9. Related services (2-card grid)
10. Final CTA

**Dropped from lighter template:**
- "What this is *not*" section (services under 25k don't need anti-scope-creep framing)
- Executive summary in deliverables (smaller engagements don't warrant one)
- Supervising practitioner block (single lead only)

### Shared assets (reused — no new CSS/JS)

- `src/styles/category-hub.css` — for breadcrumbs and cert chips
- `src/styles/service-page.css` — for hero, triggers, deliverables, process, pricing, team, FAQ, related
- Inline SVG icons (matching existing site, not Lucide)

### Category hub updates (after each page ships)

For each new service page that ships, update the corresponding category hub:

```js
// old (current state)
{ slug: "...", hasPage: false, href: "/#contact?service=..." }
// new (after page ships)
{ slug: "...", hasPage: true,  href: "/services/<category>/<slug>" }
```

This removes the "Contact to scope" badge and replaces it with "Full page", and the card click-through routes to the real page.

Category hubs affected:
- **`/services/offensive-security`**: after Web App PT, VA-only, Phishing Sim ship → 4/4 flagship cards are "Full page"
- **`/services/grc`**: after ISO 27001 Gap, PDPL, NESA, Risk Assessment ship → 5/5 flagship cards are "Full page"
- **`/services/network-infrastructure`**: after Arch Review ships → 2/2 flagship cards are "Full page"
- **`/services/cloud-security`**: after M365 Review ships → 2/2 flagship cards are "Full page"
- **`/services/training-awareness`**: after Tabletop IR ships → 2/2 flagship cards are "Full page"

### SEO metadata per page (required)

Every page must have:
- `<title>` — `[Service Name] in UAE — [differentiator] | Underwings`, < 70 chars
- `<meta name="description">` — 155 chars, contains service + "UAE" + one key differentiator + price range
- `<meta name="keywords">` — 5 – 8 UAE-local commercial-intent terms
- Open Graph title / description / image
- Canonical URL
- `schema.org/Service` JSON-LD with `offers.priceCurrency: AED`, `offers.lowPrice`, `offers.highPrice`, `provider`, `areaServed`
- `schema.org/BreadcrumbList` JSON-LD
- `schema.org/FAQPage` JSON-LD with all FAQ items

### Execution order (2 waves)

**Wave 1 — Highest commercial priority (build first, deploy together):**
1. ISO 27001 Gap Assessment (completes GRC Gap → Implementation funnel)
2. UAE PDPL Compliance Advisory (urgent enforcement demand)
3. Web Application Penetration Testing (highest-volume pen test)
4. NESA / UAE IA V2 Gap Assessment (UAE differentiator)
5. Risk Assessment & Risk Register Build (both standalone + sub-deliverable)

**Wave 2 — Complete the portfolio:**
6. Security Architecture Review (full template)
7. Microsoft 365 Security Review (lighter)
8. Vulnerability Assessment (lighter)
9. Phishing Simulation (lighter)
10. Tabletop IR Exercise (lighter)

### Verification per wave

After each wave:
1. `docker compose build frontend` → must pass with no errors
2. `docker compose up -d frontend` → restart
3. `curl -I https://underwings.org/services/<category>/<slug>` for each page → expect 200
4. Spot-check one rendered page: hero shows, prices visible, FAQ expands, CTAs work
5. Update category hub files to mark pages as `hasPage: true`
6. Rebuild + deploy hub updates
7. Confirm category hub shows "Full page" badges instead of "Contact to scope"

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Astro build breaks mid-wave | Build after each page write; don't batch unchecked |
| Content inaccuracy (timelines, pricing, process) | Use locked data from `phase1-decisions.md`; avoid invention |
| SEO cannibalization between similar pages (ISO 27001 Gap vs Implementation) | Distinct titles, meta, H1s; internal links point correctly; canonical URLs unique |
| Style drift from anchor pages | Reuse the exact patterns from the 5 anchor pages — no creative variation |
| Category hub update missed | Run smoke-test curl for every hub after the page deploys |

## Success criteria

- All 10 new pages return HTTP 200 after final deploy
- Astro build passes with no warnings introduced by this work
- Every category hub has zero "Contact to scope" badges on flagship cards
- Every page has `Service`, `BreadcrumbList`, and `FAQPage` schema validated by Google Rich Results Test
- Every page has a published price range visible in the hero
- Every page names at least one cert-backed practitioner
- `waitlist_signups` DB still works (no regression in the waitlist backend)

## Files created or modified

**Wave 1 — 5 new pages:**
- `src/pages/services/grc/iso-27001-gap-assessment.astro`
- `src/pages/services/grc/uae-pdpl-advisory.astro`
- `src/pages/services/offensive-security/web-application-penetration-testing.astro`
- `src/pages/services/grc/nesa-uae-ia.astro`
- `src/pages/services/grc/risk-assessment-register.astro`
- Update: `src/pages/services/grc/index.astro`
- Update: `src/pages/services/offensive-security/index.astro`

**Wave 2 — 5 new pages:**
- `src/pages/services/network-infrastructure/security-architecture-review.astro`
- `src/pages/services/cloud-security/microsoft-365-security-review.astro`
- `src/pages/services/offensive-security/vulnerability-assessment.astro`
- `src/pages/services/offensive-security/phishing-simulation.astro`
- `src/pages/services/training-awareness/tabletop-incident-response.astro`
- Update: `src/pages/services/network-infrastructure/index.astro`
- Update: `src/pages/services/cloud-security/index.astro`
- Update: `src/pages/services/training-awareness/index.astro`
- Update: `src/pages/services/offensive-security/index.astro` (second wave)

## Implementation notes

- Use `Write` tool for new files; `Edit` tool for category hub updates.
- Each page ~250 – 450 lines. Keep under 500 lines unless unavoidable.
- Every page imports the two shared stylesheets via `import '../../../styles/category-hub.css'; import '../../../styles/service-page.css';` — no new style blocks inside the page unless a truly unique layout is needed.
- FAQ content should reflect actual client questions and UAE-specific concerns (e.g., "Is this valid for NESA evidence?") — not generic FAQs copied between pages.
- Process timelines must be achievable by the 5-person team.
- When in doubt about a claim, soften it — "typical" beats "always", "usually" beats "every time".

---

**Status:** Approved. Implementation begins now (Wave 1).
