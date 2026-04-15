# Underwings Website — Content Reconstruction Plan

**Version:** 1.0
**Date:** 15 April 2026
**Author:** Manoj Prabhakaran
**Status:** Approved architecture; page-by-page execution follows
**Scope:** `underwings.org` public website

---

## 1. Principle

**We are reconstructing content, not the site.** The design system, component library, layout templates, Astro + Supabase stack, admin dashboard, forms, middleware, and infrastructure all stay. What changes is the information architecture and the copy that lives inside it.

This is a **content re-architecture**, delivered in 4 phases over ~2–3 weeks.

---

## 2. What stays vs. what changes

### Stays (unchanged)

- Design tokens (typography, colour system, spacing, shadows)
- Component library (buttons, cards, forms, nav, footer)
- Page layout templates (section grids, hero patterns)
- Global components: `Header.astro`, `Footer.astro`, `Layout.astro`, `PartnerLogos.astro`
- Astro routing mechanics + Supabase integration
- Admin dashboard (`admin/`), middleware (`middleware.ts`), API endpoints
- Blog and careers infrastructure (pulls from Supabase — stays as-is, content added separately)
- 404, 500, privacy policy, updates (threat feed), brand pages
- About page team section (content already accurate)
- Forms (contact, newsletter, scoping call)

### Changes (content-level)

- Homepage — re-architected around 4 pillars
- Services hub (`services/index.astro`) — rebuilt as 4-pillar mega menu + card grid
- **4 new pillar hub pages** (Offensive Security, GRC, Human Risk, Software)
- **9 new/rewritten flagship service pages** (one per Year-1 cert-backed service)
- **5 "on-request" service descriptions** (as cards on the GRC hub, no dedicated pages)
- **Year 2 / Year 3 services** as badged "Coming 2027" / "Coming 2028" cards on pillar hubs (no dedicated pages)
- Redirects for existing URLs to preserve SEO
- SEO metadata (title, meta description, Open Graph, schema) rewritten per page
- Arabic translations for top-3 pages only (Home, ISO 27001, NESA)
- Minor cleanups (remove "500+ security professionals" unless verifiable)

---

## 3. Target Information Architecture

### 3.1 Global navigation (Header)

```
Home  |  Services ▼  |  Software  |  About  |  Blog  |  Updates  |  Careers  |  Contact
                ↓
      Mega menu by 5 service categories (15 flagship services):
      ├─ Offensive Security (4)
      │    ├─ Network Penetration Testing
      │    ├─ Web Application Penetration Testing
      │    ├─ Phishing Simulation
      │    └─ Vulnerability Assessment (VA only)
      ├─ Cloud Security (2)
      │    ├─ Azure Cloud Security Assessment
      │    └─ Microsoft 365 Security Review
      ├─ Network & Infrastructure (2)
      │    ├─ Firewall & Network Security Review
      │    └─ Security Architecture Review
      ├─ GRC (5)
      │    ├─ ISO 27001 Gap Assessment
      │    ├─ ISO 27001 Implementation & Certification Support
      │    ├─ NESA / UAE IA V2 Gap Assessment
      │    ├─ UAE PDPL Compliance Advisory
      │    └─ Risk Assessment & Risk Register Build
      └─ Training & Awareness (2)
           ├─ Security Awareness Training — Workshops
           └─ Tabletop Incident Response Exercise

Software (separate top-level nav):
      └─ Cybersecurity Software Channel (vendor-neutral reselling + implementation)
```

External link in the footer: `docs.underwings.org` → "Knowledge Base".

### 3.2 URL map + 301 redirects

**Preserve existing URLs where possible to protect SEO.**

| Old URL | New URL | Action |
|---|---|---|
| `/` | `/` | Rewrite content |
| `/about` | `/about` | Keep (minor copy refresh only) |
| `/services` | `/services` | Rewrite as 5-category hub |
| `/services/vapt` | `/services/offensive-security/network-penetration-testing` | 301 + rewrite |
| `/services/iso-27001` | `/services/grc/iso-27001-implementation` | 301 + rewrite |
| `/services/security-audit` | `/services/grc` (hub) | 301 (retired as flagship; now part of GRC suite) |
| `/services/consultation` | `/services/grc` (hub) | 301 (vCISO deferred to Year 2) |
| `/services/training` | `/services/training-awareness/security-awareness-training` | 301 + re-homed |
| `/software` | `/software` | Keep top-level URL; rewrite content |

**New URLs to create (all 15 flagship services + 5 category hubs)**

```
/services                                          — master hub (5 categories grid)
/services/offensive-security                       — category hub
/services/offensive-security/network-penetration-testing
/services/offensive-security/web-application-penetration-testing
/services/offensive-security/phishing-simulation
/services/offensive-security/vulnerability-assessment

/services/cloud-security                           — category hub
/services/cloud-security/azure-cloud-security-assessment
/services/cloud-security/microsoft-365-security-review

/services/network-infrastructure                   — category hub
/services/network-infrastructure/firewall-network-security-review
/services/network-infrastructure/security-architecture-review

/services/grc                                      — category hub
/services/grc/iso-27001-gap-assessment
/services/grc/iso-27001-implementation
/services/grc/nesa-uae-ia
/services/grc/uae-pdpl-advisory
/services/grc/risk-assessment-register

/services/training-awareness                       — category hub
/services/training-awareness/security-awareness-training
/services/training-awareness/tabletop-incident-response

/software                                          — Software Channel (top-level, flat)
```

Total new pages: **5 category hubs + 15 flagship service pages + 1 services master hub + 1 software page = 22 pages** (plus Home, About, etc. already exist).

**Redirects implemented in** `nginx.conf` 301 rules (preferred — no Astro redirect component needed).

---

## 4. Page-by-page content brief

Each flagship service page uses the same template. Reuse the existing service-page component; just replace copy slots.

### 4.1 Service page template (applies to all 9 flagship pages)

Sections in order:

1. **Hero**
   - Service name (H1)
   - One-line promise (e.g. *"Manual, OSCP-led external + internal network pentest — findings, exploit walkthroughs, remediation guidance."*)
   - Price range badge (e.g. *"AED 20,000 – 60,000"*)
   - Cert-backed-by badge (e.g. *"OSCP · CPTS · CEH"*)
   - Primary CTA (scoping call)

2. **What it is** (2–3 paragraphs)
   - Plain-English explanation
   - What it is *not* (avoid scope creep early)

3. **Who it's for**
   - 3–4 trigger scenarios (e.g., "*Your enterprise client asked for a pen-test report*", "*You're preparing for ISO 27001 audit*", "*You had a phishing incident and need external validation*")

4. **What you get** (deliverables)
   - Bulleted list of concrete deliverables (scoping doc, findings report, exec summary, remediation walkthrough, re-test)

5. **How we deliver** (the process)
   - 4–5 numbered steps with durations (Scoping → Testing → Reporting → Walkthrough → Re-test)

6. **Pricing**
   - Published range
   - What drives the price (size, scope, timeline)
   - Deposit terms

7. **Cert-backed team**
   - Named practitioner + their credentials
   - Linked to About page

8. **FAQ** (5–8 questions)
   - Use real questions you've already been asked; keep answers honest and specific

9. **Secondary CTAs**
   - Book scoping call (primary)
   - Related services (cross-sell)
   - Download one-pager PDF

10. **Meta**
    - Title: `[Service Name] in UAE | Underwings`
    - Description: 155 chars with service, "UAE", and one differentiator
    - Schema: `Service` + `Breadcrumb` + `FAQPage`

### 4.2 Homepage (`src/pages/index.astro`) — rewrite brief

**Sections in order:**

1. **Hero**
   - H1: *"Cybersecurity That's Honest, Hands-On, and Credentialed."*
   - Sub: *"We deliver pen tests, GRC implementation, and human-risk programs for UAE mid-market and SMB — with named practitioners, published prices, and no consultancy overhead."*
   - Primary CTA: Book a 30-min scoping call
   - Secondary CTA: See our services

2. **Trust strip** (under hero)
   - Credential ribbon: "OSCP · CPTS · CEH · CCNP · Fortinet · Azure Security · ISO 27001 Lead Auditor · GRC Mastery"
   - Response SLA: "Reply within 24 hours · UAE-based team"

3. **Four-pillar architecture** (the centrepiece)
   - One card per pillar, each with icon, name, 1-line description, and list of sub-services
   - Click-through to pillar hub

4. **Why Underwings** (3 blocks)
   - *"Implementation, not advice"* — we finish what we start
   - *"Cert-backed, named practitioners"* — no anonymous teams, no inflated bios
   - *"Transparent published pricing"* — see the price before the call

5. **How we work** (5 steps, reused from services hub)
   - Scoping → Assessment → Delivery → Walk-through → Re-test / Retainer

6. **Featured content** (pull 3 latest blog posts from Supabase — same as today)

7. **Final CTA block** (big, bold)
   - *"Have an upcoming audit, failed assessment, or board directive? Let's talk."*
   - Contact form (same as today)

**Remove:**
- Any "500+ security professionals" claim (unless we verify the subscriber list)
- Generic adjectives ("world-class", "industry-leading") — none exist currently but this is a standing rule

### 4.3 About page (`src/pages/about.astro`) — minor refresh

- Keep team section as-is (accurate)
- Keep origin story
- Add a small block: *"Launching 2026. Bootstrapped by the founding team. Built in the UAE."* — lean into the "just starting" honest posture instead of hiding it.
- Add credential chip strip under the founder photo

### 4.4 Pillar hub pages (4 new pages)

Each hub follows the same template. Template sections:

1. **Pillar hero** — pillar name, 2-line description, which certs power it
2. **Flagship services grid** — cards for each Y1 service (click-through)
3. **Also available on request** (GRC hub only) — PDPL, ISO 27701, NIST CSF, vCISO, MVM as non-clickable cards with short description + "Contact for scope" CTA
4. **Coming soon** — Y2 and Y3 services as badged cards (e.g., "Coming 2027") with short description + "Join waitlist" email capture (Listmonk list per service)
5. **Why this pillar matters for UAE** — 2-3 paragraph explainer tied to PDPL / NESA / compliance environment
6. **CTA** — scoping call

### 4.5 Offensive Security hub — specific content

- **Flagship Y1:** Network Penetration Testing, Web Application Penetration Testing, Phishing Simulation, Vulnerability Assessment (VA only)
- **Coming 2027:** Vendor Risk Assessment, Managed Vulnerability Management
- **Coming 2028:** Red Team, SOC / MDR, DFIR, CTI, OT/ICS

### 4.6 Cloud Security hub — specific content

- **Flagship Y1:** Azure Cloud Security Assessment, Microsoft 365 Security Review
- **Coming 2027:** AWS Cloud Security Assessment, GCP Cloud Security Assessment
- **Positioning note:** UAE is Microsoft-heavy — lead with Azure + M365 as flagship; AWS / GCP badged for future.

### 4.7 Network & Infrastructure hub — specific content

- **Flagship Y1:** Firewall & Network Security Review, Security Architecture Review
- **Coming 2027:** Zero Trust Architecture Design, Network Segmentation Implementation
- **Positioning note:** "Rare skill combo — OSCP-level pen-testing understanding applied to network design" — lean into it.

### 4.8 GRC hub — specific content

- **Flagship Y1:** ISO 27001 Gap Assessment, ISO 27001 Implementation & Certification Support, NESA / UAE IA V2 Gap Assessment, UAE PDPL Compliance Advisory, Risk Assessment & Risk Register Build
- **Coming 2027:** Incident Response Retainer, ISO 27701, NIST CSF board reporting, vCISO Retainer, PCI DSS v4.0 (if fintech), Dubai ISR v2, Third-Party Risk Assessment
- **Coming 2028:** NCA ECC + SAMA, COBIT 2019, ISO 42001 (AI Governance), DORA/NIS2

### 4.9 Training & Awareness hub — specific content

- **Flagship Y1:** Security Awareness Training — Workshops, Tabletop Incident Response Exercise
- **Coming 2027:** Security Awareness E-Learning SaaS Platform, Compliance-specific training tracks
- **Waitlist priority:** E-Learning SaaS is the highest-value waitlist capture on this page.

### 4.10 Software channel page — specific content

- Reframed from "services/software.astro" as *"Vendor-neutral evaluation, procurement, and implementation."*
- 11 category cards (EDR, SIEM, Email Sec, NGFW, IAM, Cloud Sec, VM, DLP, Backup, GRC Platforms, Awareness Platforms)
- Explicit note: *"We recommend based on your requirements, not vendor incentives. Partner logos appear only after formal agreement."*
- Partner logos section stays hidden until agreements are signed (correct current behaviour)

---

## 5. Coming Soon treatment

**Decision: badged cards on pillar hubs, NOT standalone pages.**

### Why
- Standalone Coming Soon pages are thin content → SEO penalty
- Thin pages create a trust gap (visitor lands, gets nothing, leaves)
- Badged cards give the positioning benefit (forward-looking, serious roadmap) without the thin-content risk

### Card pattern (Coming Soon)

```
┌──────────────────────────────────────┐
│ [Service Name]              [2027]   │
│                                      │
│ One-sentence description.            │
│ Two-sentence explanation of value.   │
│                                      │
│ 📧 Join waitlist — notified at launch│
└──────────────────────────────────────┘
```

- "2027" / "2028" badge uses brand accent colour
- Waitlist CTA captures email → Listmonk list named per service (e.g., `waitlist-pci-dss`, `waitlist-red-team`)
- Admin dashboard gets a simple "Waitlist interest" view showing which services are being requested

### Admin change required
- Add `waitlist_signups` table to Supabase (service_slug, email, captured_at)
- Admin dashboard: tile showing signup count per service — helps inform which Y2/Y3 service to prioritise
- API endpoint: `POST /api/waitlist` writes row + subscribes to Listmonk list

---

## 6. SEO preservation & uplift

### Preservation
- 301 redirects for every moved URL (see URL map above)
- Keep existing `sitemap.xml` generator; regenerate after rewrite
- Preserve canonical URLs on redirected pages

### Uplift (new work)
- Per-page meta titles and descriptions rewritten for UAE-local intent keywords (see marketing plan Section 5.2 keyword clusters)
- Schema markup added per page: `Organization` (global), `Service` (flagship pages), `BreadcrumbList`, `FAQPage` (service pages with FAQ), `LocalBusiness` (contact + about)
- Internal linking map: every service page links to (a) its pillar hub, (b) 2 related services, (c) 1 relevant blog post
- Image alt text audit — every non-decorative image gets descriptive alt text
- Open Graph images per page (use Astro dynamic OG image generator if possible)
- `hreflang` tags on Arabic pages (3 pages)
- Core Web Vitals audit after reconstruction (Astro should remain in green)

---

## 7. Arabic localisation (limited scope)

**Only 3 pages translated for this reconstruction phase.** Half-done bilingual hurts more than English-only.

1. `/ar` — Homepage Arabic
2. `/ar/services/grc/iso-27001` — ISO 27001 Arabic
3. `/ar/services/grc/nesa-uae-ia` — NESA Arabic

- Professional translation (not machine-translated)
- Language switcher in header (EN ↔ AR)
- `hreflang` declaration
- RTL layout verified

Other Arabic pages are defer-until-ready.

---

## 8. Execution phases

### Phase 1 — IA lock + redirect map (1–2 days)
**Deliverables**
- Finalized nav tree + mega menu
- URL map + nginx 301 rules drafted
- Service-page template reviewed on a single pilot page (Network Pen Testing) for sign-off before rolling out

**Sign-off gate:** Manoj approves IA + pilot page before Phase 2.

### Phase 2 — Homepage + 4 pillar hubs (4–5 days)
**Deliverables**
- Homepage rewrite (new hero, 4-pillar architecture, trust strip, why-us, how-we-work, CTA)
- 4 pillar hub pages (Offensive, GRC, Human Risk, Software)
- Coming Soon badged cards + waitlist Supabase table + API endpoint

**Sign-off gate:** Manoj approves each pillar hub before Phase 3.

### Phase 3 — 15 flagship service pages (7–10 days)
**Deliverables**
- 4 Offensive Security pages (Network PT, Web PT, Phishing Sim, VA only)
- 2 Cloud Security pages (Azure, M365)
- 2 Network & Infrastructure pages (Firewall Review, Arch Review)
- 5 GRC pages (ISO 27001 Gap, ISO 27001 Implementation, NESA, PDPL, Risk Assessment)
- 2 Training & Awareness pages (Awareness Workshops, Tabletop IR)
- Published pricing on every page
- FAQs on every page
- Cross-links to related services
- Linked one-pager PDFs (15 PDFs — one per service; designer-produced)

**Sign-off gate:** Manoj reviews each page for technical accuracy (~30 min per page = ~5 hours total).

### Phase 4 — Polish, SEO, Arabic, launch (2–3 days)
**Deliverables**
- Schema markup everywhere
- Sitemap regenerated
- 301 redirects deployed to nginx
- Arabic 3-page translation published
- Core Web Vitals audit
- Broken link check
- Analytics event map updated (GA4 / Plausible / self-hosted)
- Public launch announcement: LinkedIn post + newsletter

**Sign-off gate:** Full-site QA walkthrough with Manoj before anything goes live.

---

## 9. Ownership (RACI-lite)

| Area | Responsible | Accountable | Consulted |
|---|---|---|---|
| IA + nav + URL map | Manoj | Manoj | Prathima |
| Homepage copy | Prathima + Manoj | Manoj | — |
| Pillar hub copy | Prathima | Manoj | — |
| Flagship service page copy (technical) | Manoj | Manoj | Nelson (offensive pages), Vinoth (network pages) |
| Service page copy (polish + SEO) | Prathima | Prathima | Manoj |
| Coming Soon waitlist feature (DB + API + admin) | Gowtham | Manoj | — |
| Redirect rules (nginx) | Vinoth | Manoj | Gowtham |
| Schema + SEO meta | Prathima | Prathima | — |
| Arabic translation | Prathima (vendor-managed) | Prathima | Manoj |
| One-pager PDF design | External designer via Prathima | Prathima | Manoj |
| Final QA | Manoj | Manoj | All |

---

## 10. Success criteria (post-reconstruction)

1. All 9 flagship services have dedicated pages with published pricing and named cert-backed practitioners.
2. 4 pillar hub pages published with flagship + on-request + Coming Soon cards.
3. Waitlist captures working end-to-end for every Coming Soon service.
4. All old URLs 301-redirect to new homes (no broken internal or external links).
5. Core Web Vitals stay in green.
6. Sitemap + schema validated (Google Rich Results Test passes).
7. 3 Arabic pages live with working EN↔AR switcher.
8. All "500+ security professionals" (and similar unverifiable claims) removed.
9. Homepage and every pillar hub have a single primary CTA (scoping call).
10. Manoj approves every page technically before launch.

---

## 11. Out-of-scope for this reconstruction

Explicitly deferred to later work:

- Blog content seeding (tracked in `marketing-sales-plan-q2-2026.md` — 10–12 posts in the 4-month window)
- Case study pages (template shell shipped; content arrives after first 3 paying clients)
- Brand refresh / logo refinement
- Visual design overhaul
- Admin dashboard redesign (back-end stays unchanged)
- Full Arabic translation (only 3 pages in this phase)
- Japanese/Saudi/GCC language variants
- Paid-media landing page variants (Phase 2 project post-launch)

---

## 12. Appendices

### Appendix A — File touchpoints (expected)

**Rewrites:**
- `src/pages/index.astro`
- `src/pages/services/index.astro`
- `src/pages/services/vapt.astro` → renamed / moved
- `src/pages/services/iso-27001.astro` → moved
- `src/pages/services/security-audit.astro` → retired
- `src/pages/services/consultation.astro` → retired / redirected
- `src/pages/services/training.astro` → retired / redirected
- `src/pages/software.astro` → moved to `services/software/index.astro`

**New files:**
- `src/pages/services/offensive-security/index.astro` + 5 sub-pages
- `src/pages/services/grc/index.astro` + 2 sub-pages
- `src/pages/services/human-risk/index.astro` + 2 sub-pages
- `src/pages/services/software/index.astro`
- `src/pages/api/waitlist.ts`
- `src/components/ComingSoonCard.astro`
- `src/components/ServiceHero.astro` (if not already componentised)
- `src/components/CertBackedBadge.astro`
- `src/components/PricingBadge.astro`

**Config changes:**
- `nginx/nginx.conf` — add 301 redirect block
- `astro.config.mjs` — update routes if needed
- Supabase — add `waitlist_signups` table + RLS policy

### Appendix B — Quality checklist (per-page)

Every service page, before sign-off, must:

- [ ] Cite a named practitioner + their credential
- [ ] Show a published price range
- [ ] Include "Who it's for" triggers
- [ ] Include "What you get" deliverables list
- [ ] Include "How we deliver" numbered process
- [ ] Include 5–8 FAQs
- [ ] Link to 2 related services (cross-sell)
- [ ] Link to at least 1 blog post (when available)
- [ ] Have a scoping-call CTA in hero + mid-page + end-page
- [ ] Have SEO title, meta description, OG image
- [ ] Have `Service` + `FAQPage` schema
- [ ] Pass mobile preview check
- [ ] Read fluently on desktop at 100% zoom
- [ ] Pass Manoj technical-accuracy review

### Appendix C — Revision log

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-15 | Manoj Prabhakaran | Initial reconstruction plan |

---

**End of Website Reconstruction Plan v1.0.**
