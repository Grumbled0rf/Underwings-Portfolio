# Phase 2 — Content Briefs: Homepage, 5 Category Hubs, Waitlist Backend

**Version:** 1.0
**Date:** 15 April 2026
**Status:** Ready for Manoj review before implementation
**Dependencies:** `phase1-decisions.md` (locked)

This document contains everything needed to build Phase 2:
- Complete homepage rewrite copy
- A reusable category-hub page template
- Category-specific copy for all 5 hubs
- Waitlist backend specification (Supabase schema + API + admin tile)

---

## 1. Homepage (`src/pages/index.astro`) — Full Rewrite Copy

### 1.1 Hero section

**H1:**
> Cybersecurity That's Honest, Hands-On, and Credentialed.

**Sub-headline (tight, one breath):**
> UAE mid-market cybersecurity — pen testing, ISO 27001, Azure security, PDPL, and phishing sims — delivered by OSCP and ISO 27001 Lead Auditor certified practitioners. Published prices. Written quote within 48 hours.

**Primary CTA:** `Book a Free 30-min Scoping Call →`
**Secondary CTA:** `See Our Services →` (→ `/services`)

**Commitment strip (directly under the CTAs — 4 icon pills, horizontally aligned, wraps on mobile):**
> 💳 Published pricing · ⏱ 48-hour written quote · 🔐 Named certified practitioners · 🇦🇪 UAE-based delivery

**Trust ribbon (second row, animated or statically listed — hover tooltip shows "held by Manoj / Nelson / Vinoth"):**
> OSCP · CPTS · CEH · CCNP · Fortinet · Azure Security · ISO 27001 Lead Auditor · GRC Mastery · CDSA · Security+

**Timezone-aware response SLA line** (keep existing logic):
> 🇦🇪 UAE team online — reply within hours / Reply within 24 hours

### 1.2 "What We Do" — 5 Category Cards

A grid of 5 cards, each linking to the relevant category hub. Same card component pattern as the existing services grid.

**Copy leads with outcome** (what the client gets) **not capability** (what we do). **Icon column uses Lucide icons** (Astro integration — `lucide-astro`), not emojis, for visual consistency with existing site.

| Icon (Lucide) | Heading | Outcome-led description | Count | Link |
|---|---|---|---|---|
| `Target` | **Offensive Security** | See what an attacker would actually do — manual pen tests by OSCP holders, not vulnerability-scan PDFs. | 4 services | `/services/offensive-security` |
| `Cloud` | **Cloud Security** | Fix the 10 – 30 high-severity Azure and M365 misconfigurations most UAE businesses don't know they have. | 2 services | `/services/cloud-security` |
| `Network` | **Network & Infrastructure** | Review your FortiGate and network design with a rare CCNP + Fortinet + OSCP combination. | 2 services | `/services/network-infrastructure` |
| `ClipboardCheck` | **Cybersecurity GRC** | Get ISO 27001 certified, NESA-ready, or PDPL-compliant — with an ISO 27001 Lead Auditor doing the work. | 5 services | `/services/grc` |
| `Users` | **Training & Awareness** | Train your team using live attack demos by the people who run the pen tests. Measure real behaviour change. | 2 services | `/services/training-awareness` |

### 1.3 "Why Underwings" — 3-Block Differentiator Section

**Block 1 — Cert-backed, named practitioners**
> Every engagement is led by a named practitioner with a documented industry credential — OSCP, CPTS, CCNP, ISO 27001 Lead Auditor, Azure Security, GRC Mastery. You see their name, their cert, and their face before you sign.

**Block 2 — Implementation, not advice**
> We don't hand you a PDF and walk away. **Every pen test ends with a re-test.** Every ISO 27001 project ends with issued policies, configured controls, and an accredited certification body at your door. Every awareness program ends with measured click-rate drops. Advisors leave. We finish.

**Block 3 — Transparent published pricing**
> Every service on this site shows its real price range — and after a 30-minute scoping call, you get a **written quote within 48 hours**. No mystery pricing. No bait-and-switch. No "let's jump on a call to discuss budget." You know what to plan for before the first conversation.

### 1.4 "How We Work" — 5-Step Process Timeline

Reuse the existing process-timeline component from `services/index.astro`.

1. **Scope** — 60-minute call, written price range within 48 hours
2. **Assess / Test** — manual work by named practitioners with documented credentials
3. **Report** — findings with business impact, not just technical severity
4. **Walkthrough** — live session with your team; questions answered
5. **Re-test or retain** — validate fixes, or move onto a longer retainer

### 1.5 "UAE Regulatory Context" — New section (replaces old "why us" filler)

**Heading:** Built for UAE Compliance Reality

**Body (single paragraph):**
> UAE PDPL enforcement is ramping. NESA and UAE IA V2 assessments are active. ADHICS is mandatory for Abu Dhabi healthcare. Dubai ISR v2 is a gate for government contracts. Our Year-1 services are shaped around exactly this environment — ISO 27001 implementation, NESA gap assessments, PDPL advisory, and Risk Register builds delivered by a team that has lived inside these frameworks, not just read the standard.

**Small CTA:** `See our GRC services →` (→ `/services/grc`)

### 1.6 Latest from the Blog — 3 featured posts

Keep the existing Supabase-backed blog-feature component. No change.

### 1.7 "This might not be right for you if…" — New counterintuitive trust section

Bold, confident section — **counterintuitively builds credibility** by being clear about who we don't serve. Signals confidence and filters out bad-fit leads that waste founder time.

**Heading:** This might not be the right fit if you need…

- **A rubber-stamp vulnerability scan PDF** to satisfy a single compliance checkbox — we don't do checkbox work
- **The cheapest provider in the market** — we're transparent but we're not a bottom-of-market bidder
- **A Big-4 brand name on the report** — we deliver better work but you won't get a PwC or Deloitte logo
- **24/7 SOC / MDR service today** — we'll partner with an MSSP for Year 1 – 2 before building our own

**Sub-line (small):**
> If any of these describe what you need, we'll tell you honestly in the scoping call and refer you to someone who fits better.

### 1.8 Honest Posture Strip (below featured content — new)

Small single-line banner:
> Launching 2026 in the UAE. Bootstrapped by the founding team. **We're pursuing our own ISO 27001:2022 certification in 2026 — the same program we deliver to clients, applied to ourselves first.**

### 1.8 Final CTA Block

**Heading:** Got an upcoming audit, a failed assessment, or a board asking hard questions?

**Sub:** A 30-minute scoping call is free. We'll give you a written price range within 48 hours.

**Primary CTA:** Open the contact form
**Contact form** — keep existing component with Turnstile CAPTCHA, GDPR consent, service dropdown (pre-populated from URL param)

### 1.9 Elements removed from current homepage

- Any "500+ security professionals" claim (unverifiable)
- Any "trusted by" wording unless real logos exist
- Partner logos section stays commented out
- Any generic adjectives ("world-class", "next-generation", "industry-leading")

### 1.10 Meta

- **Title:** `Underwings — UAE Cybersecurity Services | Pen Testing · GRC · Cloud · Awareness`
- **Description:** `UAE-based cybersecurity services by named, certified practitioners. Pen testing, ISO 27001, NESA, PDPL, Azure security, phishing sims. Published pricing, hands-on delivery.`
- **OG image:** site-wide homepage OG (to be produced)

---

## 2. Category Hub Page — Reusable Template

All 5 category hubs follow the same structural template. Only the content inside the slots differs per category.

### Template sections

1. **Breadcrumb:** Home › Services › [Category]
2. **Hero:**
   - Category name (H1)
   - 2-line description
   - "Powered by" cert ribbon (category-specific certs)
   - Primary CTA: Book scoping call
3. **Flagship Services Grid** — cards, one per Y1 service in this category; each click-through to the service page
4. **Coming Soon Grid** — badged cards with "Coming 2027" / "Coming 2028"; each has waitlist email capture
5. **Why this category matters for UAE** — 2-3 paragraph regulatory / market context
6. **Related categories** — 3 small cards linking to other category hubs
7. **Final CTA:** Scoping-call block

### Card pattern — Flagship service card

```
┌─────────────────────────────────┐
│ [Icon or number]                │
│ Service Name                    │
│ One-line description.           │
│                                 │
│ AED 20k – 60k   |   OSCP · CPTS │
│                                 │
│ Learn more →                    │
└─────────────────────────────────┘
```

### Card pattern — Coming Soon card

Optimised for conversion: single email field (name/company are asked on a follow-up thank-you page, not the initial capture — every extra field drops conversion ~10%). CTA copy is year-specific to set clear expectations.

```
┌──────────────────────────────────────────┐
│ Service Name                  [2027]     │
│ One-line description.                    │
│ Short paragraph of 2 sentences on        │
│ what it delivers and why it matters.     │
│                                          │
│ Launch target: H2 2027                   │
│                                          │
│ [ email@company.com ]                    │
│ [  Add me to the 2027 waitlist  →  ]     │
└──────────────────────────────────────────┘
```

Post-submit state:
```
✓ You're on the 2027 waitlist.
  We'll email you with a 30-day
  heads-up before we launch this.

  [ Tell us more (optional) ]  ← expands to collect name/company
```

**Launch-target line** is only shown when we have genuine confidence (H1 / H2 of the year). If we don't, omit the line entirely — vague "coming 2027" is more honest than a fake target.

---

## 3. Category Hub — Specific Copy

### 3.1 Offensive Security (`/services/offensive-security`)

**Hero headline:** Offensive Security

**Hero subhead:**
> Manual pen testing, phishing simulations, and vulnerability assessments led by OSCP, CPTS, and CEH holders. We don't run a scanner and call it a pen test.

**Cert ribbon:** OSCP · CPTS · CEH · CDSA

**Flagship services (4 cards):**
1. Network Penetration Testing — AED 20k – 60k — OSCP · CPTS · CEH
2. Web Application Penetration Testing — AED 15k – 40k — CPTS · CEH · OSCP
3. Phishing Simulation — AED 8k – 20k — CEH · CPTS
4. Vulnerability Assessment (VA only) — AED 5k – 15k — OSCP · CPTS

**Coming Soon cards:**
- **Third-Party / Vendor Risk Assessment** [2027] — Assess the security posture of your suppliers and vendors. UAE IA V2 and ISO 27001 both require this. We're building a scalable, questionnaire-driven delivery model.
- **Managed Vulnerability Management** [2027] — Continuous scanning, prioritisation, and remediation tracking — delivered as a monthly retainer with your named engineer.
- **Red Team Exercises** [2028] — Full-scope adversary simulation: physical, digital, and social engineering. Requires senior red-team hire (CRTO / OSEP).
- **SOC-as-a-Service / MDR** [2028] — 24/7 monitoring, detection, and response. MSSP partnership bridge in Year 2, own build in Year 3.
- **Digital Forensics & Incident Response (DFIR)** [2028] — Breach investigation, forensic reporting, legal-grade evidence handling. GCFE / GCFA certified analysts.
- **Cyber Threat Intelligence (CTI)** [2028] — Sector-specific threat intel, dark-web monitoring, quarterly briefings.
- **OT / ICS Security (IEC 62443)** [2028] — Operational technology security for utilities, energy, manufacturing. Specialist hire required.

**Why this matters for UAE:**
> Every UAE enterprise onboarding process — from banks to tender committees to enterprise procurement — asks for penetration-test evidence. Most UAE mid-market companies respond with a vulnerability scan PDF. That's not what auditors and enterprise procurement teams are asking for. We deliver the real thing: manual, methodical, exploit-driven testing by practitioners who can demonstrate what an attacker would actually achieve against your environment.

### 3.2 Cloud Security (`/services/cloud-security`)

**Hero headline:** Cloud Security

**Hero subhead:**
> Azure and Microsoft 365 posture assessments against the CIS benchmark and Microsoft security best practices. UAE is Microsoft-heavy — this is where most of your real cloud risk lives.

**Cert ribbon:** Azure Security · Security+ · CDSA

**Flagship services (2 cards):**
1. Azure Cloud Security Assessment — AED 15k – 35k — Azure Security
2. Microsoft 365 Security Review — AED 10k – 25k — Azure Security · Security+

**Coming Soon cards:**
- **AWS Cloud Security Assessment** [2027] — CIS AWS benchmark, IAM, VPC, S3, GuardDuty posture. Launching when AWS adoption in our UAE client base crosses threshold.
- **GCP Cloud Security Assessment** [2028] — CIS GCP benchmark, IAM, Cloud Logging, Security Command Center.
- **Cloud Native Application Protection Platform (CNAPP) Implementation** [2028] — Unified CSPM + CWPP + CIEM platform rollout.

**Why this matters for UAE:**
> UAE has one of the highest Microsoft cloud-adoption rates in the region. Most UAE mid-market organisations run their entire business on Microsoft 365 and Azure — and most have not configured the security baseline beyond the default Conditional Access policy. Every assessment we've seen has 10 – 30 high-severity misconfigurations that take hours, not months, to fix. This is the highest-ROI cloud security work available.

### 3.3 Network & Infrastructure (`/services/network-infrastructure`)

**Hero headline:** Network & Infrastructure Security

**Hero subhead:**
> FortiGate firewall reviews and full security architecture design, delivered by practitioners who hold CCNP, Fortinet, and OSCP — a rare combination in the UAE market.

**Cert ribbon:** CCNP · Fortinet · Security+ · OSCP

**Flagship services (2 cards):**
1. Firewall & Network Security Review — AED 12k – 30k — Fortinet · CCNP · OSCP
2. Security Architecture Review — AED 15k – 35k — CCNP · Security+ · Fortinet

**Coming Soon cards:**
- **Zero Trust Architecture Design** [2027] — End-to-end ZTNA design — identity-driven, least-privilege, segmentation-first. For clients replacing VPN and flat networks.
- **Network Segmentation Implementation** [2027] — Hands-on segmentation delivery — VLAN redesign, microsegmentation, PCI zone carve-out.

**Why this matters for UAE:**
> Most UAE mid-market networks are flat, perimeter-trusting, and running firewall rule sets that haven't been reviewed in years. FortiGate is the dominant platform — and most organisations we've seen have 30 – 200 stale or overly permissive rules that an attacker would exploit in minutes. Pair this with our pen-test work and you get the full picture: how the network is designed versus how an attacker would move through it.

### 3.4 Cybersecurity GRC (`/services/grc`)

**Hero headline:** Cybersecurity GRC

**Hero subhead:**
> ISO 27001, NESA / UAE IA V2, PDPL, and formal risk assessments — delivered hands-on by an ISO 27001 Lead Auditor and GRC Mastery practitioner. We implement; accredited certification bodies certify.

**Cert ribbon:** ISO 27001 Lead Auditor · GRC Mastery · CDSA · Security+

**Flagship services (5 cards):**
1. ISO 27001 Gap Assessment — AED 20k – 40k — ISO 27001 Lead Auditor
2. ISO 27001 Implementation & Certification Support — AED 50k – 120k — ISO 27001 LA · GRC Mastery
3. NESA / UAE IA V2 Gap Assessment — AED 20k – 50k — GRC Mastery · ISO 27001 LA
4. UAE PDPL Compliance Advisory — AED 15k – 35k — GRC Mastery · ISO 27001 LA
5. Risk Assessment & Risk Register Build — AED 20k – 45k — GRC Mastery · ISO 27001 LA

**Coming Soon cards:**
- **Incident Response Retainer** [2027] — Monthly retainer for IR SLA, playbook maintenance, and annual exercise. Your IR team on speed-dial.
- **ISO 27701:2025 (Privacy Information Management)** [2027] — Privacy management systems layered on ISO 27001. Natural upsell as UAE PDPL enforcement tightens.
- **NIST CSF 2.0 + Board-Level Risk Reporting** [2027] — Structured risk programs with appetite statements, risk registers, and quarterly board reports.
- **vCISO / Fractional CISO Retainer** [2027] — Monthly fractional CISO engagement for mid-market organisations that don't need a full-time hire yet.
- **PCI DSS v4.0** [2027] — Payment card compliance — if fintech vertical anchored in Year 1.
- **Dubai ISR v2** [2027] — Dubai Government information security regulation — for government-adjacent and supplier contracts.
- **Third-Party Risk Assessment** [2027] — Scalable vendor security assessment service.
- **NCA ECC + SAMA CSF** [2028] — Saudi Arabia market entry compliance.
- **COBIT 2019** [2028] — Enterprise IT governance for banks, telcos, government.
- **ISO/IEC 42001 (AI Governance)** [2028] — First-mover AI governance advisory in UAE.
- **DORA / NIS2** [2028] — EU financial and critical-infrastructure directives (demand-pull only).

**Why this matters for UAE:**
> UAE PDPL is in its enforcement phase. NESA / UAE IA V2 assessments are being run across semi-government and regulated sectors. ADHICS compliance is mandatory for Abu Dhabi healthcare providers. Dubai ISR v2 is a gate for any Dubai government supplier. Every one of these frameworks needs implementation, not more advice. Our team has lived inside these standards — not just read them — and we deliver hands-on programmes that end with audit-ready evidence and operational controls.

### 3.5 Training & Awareness (`/services/training-awareness`)

**Hero headline:** Training & Awareness

**Hero subhead:**
> Security awareness workshops and tabletop incident-response exercises that stick — because they're demonstrated by the same people who do the offensive work.

**Cert ribbon:** CEH · OSCP · CPTS · ISO 27001 Lead Auditor · GRC Mastery

**Flagship services (2 cards):**
1. Security Awareness Training — Workshops — AED 8k – 25k — CEH · OSCP · GRC Mastery
2. Tabletop Incident Response Exercise — AED 8k – 20k — CPTS · ISO 27001 LA

**Coming Soon cards:**
- **Security Awareness E-Learning Platform** [2027] — Our own self-serve LMS with per-seat annual licensing. Micro-lessons, phishing scores, and compliance tracking.
- **Role-Specific Training Tracks** [2027] — Targeted tracks for developers (secure coding), executives (board-level cyber), and finance teams (wire-fraud and social engineering).

**Why this matters for UAE:**
> Most UAE security awareness programmes are a once-a-year slideshow that employees click through without reading. Ours isn't. We demonstrate live attack techniques in the workshop, run phishing simulations to measure real behaviour change, and pair training with tabletop exercises that surface what your team actually does when the alarm goes off. The offensive team delivers the training — because the people who know how attacks work are the ones who can explain why defence matters.

---

## 4. Waitlist Backend Specification

### 4.1 Supabase table

**Table:** `waitlist_signups`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key, `gen_random_uuid()` default |
| `service_slug` | text | not null; e.g. `red-team-exercises`, `iso-27701` |
| `email` | text | not null; validated format at API layer |
| `name` | text | nullable |
| `company` | text | nullable |
| `source_page` | text | e.g. `/services/grc`; useful for attribution |
| `user_agent` | text | captured at API layer |
| `ip_hash` | text | SHA-256 of IP for rate-limit and abuse detection (no raw IP stored) |
| `captured_at` | timestamptz | default `now()` |
| `synced_to_listmonk_at` | timestamptz | nullable; set when pushed to Listmonk |
| `listmonk_list_id` | integer | nullable; Listmonk list ID per service |

**Indexes:**
- `CREATE INDEX ON waitlist_signups (service_slug, captured_at DESC);`
- `CREATE INDEX ON waitlist_signups (email);`
- `CREATE UNIQUE INDEX ON waitlist_signups (service_slug, lower(email));` — prevent duplicate signups per service

**RLS policies:**
- **Insert:** allowed from anon role with Turnstile CAPTCHA verified (server-side check, not RLS — RLS just allows insert)
- **Select:** authenticated admin role only
- **Update / Delete:** service role only (admin cleanup operations)

### 4.2 API endpoint

**Route:** `POST /api/waitlist` (`src/pages/api/waitlist.ts`)

**Request body:**
```json
{
  "service_slug": "red-team-exercises",
  "email": "user@example.com",
  "name": "optional",
  "company": "optional",
  "source_page": "/services/offensive-security",
  "turnstile_token": "cf-turnstile-response"
}
```

**Logic:**
1. Validate Turnstile token against Cloudflare API — reject if invalid
2. Validate email format (strict regex)
3. Validate `service_slug` against a whitelist (the list of Y2/Y3 services); reject unknown slugs
4. Hash client IP with SHA-256
5. Insert into `waitlist_signups` (handle unique-constraint duplicate as success — "already on waitlist")
6. Send to Listmonk (`POST /api/subscribers` with list ID mapped from `service_slug`) — best-effort, don't fail the request if Listmonk errors
7. Mark `synced_to_listmonk_at` on success
8. Return `{ ok: true, already_registered: boolean }`

**Response codes:**
- `200` success (whether first signup or already registered)
- `400` invalid input (bad email, unknown service_slug)
- `403` Turnstile failure
- `429` rate limit (3 signups per IP hash per hour)
- `500` unexpected error

### 4.3 Listmonk integration

- Create one Listmonk list per Y2 + Y3 service (13 lists total)
- Naming convention: `Waitlist — <Service Name>`
- List IDs stored in a config file: `src/lib/waitlist-lists.json`
- Automation: first welcome email per list, no follow-up drip in Phase 2

### 4.4 Admin dashboard tile

**New tile in `admin/`:** "Waitlist Interest"

**Display:**
- Total signups (last 30 days / all-time)
- Top 5 services by signup count
- Trend sparkline per service (last 12 weeks)
- Export button → CSV of (service_slug, email, company, captured_at) for service-by-service demand analysis
- Drill-through table: filter by service_slug, date range; view 50 at a time

**API route (admin-only):** `GET /api/admin/waitlist?service=<slug>&from=<date>&to=<date>`

### 4.5 Component: `<ComingSoonCard>`

**Props:**
- `serviceSlug` (string, required)
- `serviceName` (string, required)
- `year` (`2027` | `2028`)
- `description` (string, required)
- `elevator` (string, required — 2-sentence paragraph)

**Behaviour:**
- Renders Coming Soon card per pattern in Section 2
- Inline email input + "Notify me" button
- On submit: `POST /api/waitlist` with service_slug
- On success: inline message "You're on the list — we'll email you when this launches." Replace form with confirmation.
- On 429: "You've signed up a few times recently — we've got you. Check your inbox."
- On 403/500: "Something went wrong. Please try again or email hello@underwings.org."

### 4.6 Rate limiting

- Per IP hash: 3 signups per hour across all services (API layer check with in-memory LRU or Supabase query)
- Per email: 1 signup per service (enforced by unique index)
- Per source_page: no limit (legitimate multi-service interest)

---

## 5. Implementation file touchpoints (Phase 2)

**New files to create:**
- `src/components/CategoryCard.astro` (used on homepage + master services hub)
- `src/components/FlagshipServiceCard.astro` (used on category hubs)
- `src/components/ComingSoonCard.astro`
- `src/components/PricingBadge.astro` (already specced in Phase 1)
- `src/components/CertBackedBadge.astro` (already specced in Phase 1)
- `src/components/CategoryHubHero.astro`
- `src/pages/services/offensive-security/index.astro`
- `src/pages/services/cloud-security/index.astro`
- `src/pages/services/network-infrastructure/index.astro`
- `src/pages/services/grc/index.astro`
- `src/pages/services/training-awareness/index.astro`
- `src/pages/api/waitlist.ts`
- `src/lib/waitlist-lists.json` (Listmonk list ID map)
- `admin/src/js/waitlist.js` (admin tile)

**Files to rewrite:**
- `src/pages/index.astro` (homepage rewrite per Section 1)
- `src/pages/services/index.astro` (now a 5-category master hub — simple grid of 5 CategoryCard components)

**Supabase migration:** `supabase/migrations/YYYYMMDD_waitlist_signups.sql`

**Env config additions:**
- `TURNSTILE_SECRET_KEY` (if not already present for contact form — likely reusable)
- `LISTMONK_API_URL`, `LISTMONK_API_USERNAME`, `LISTMONK_API_TOKEN`

---

## 6. Approval gate before code

Before any Astro file is edited or Supabase migration is created, Manoj confirms:

- [ ] Homepage hero + subhead + trust ribbon copy
- [ ] 5 category-card descriptions + counts
- [ ] All 5 category hub headlines + subheads + "why this matters" copy
- [ ] All Coming Soon descriptions (Y2 + Y3) read accurately and don't overpromise
- [ ] Waitlist Supabase schema is acceptable (columns, indexes, RLS)
- [ ] Admin dashboard tile design is acceptable
- [ ] Listmonk integration is the right fit (or swap for Mailchimp / another tool)
- [ ] Rate limiting thresholds feel right (3/hour/IP, 1/email/service)

Once approved, Phase 2 implementation begins. Expected duration: 4 – 5 days.

---

**End of phase2-content-briefs.md v1.0.**
