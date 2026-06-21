# Underwings — Keyword & Conversion Strategy

**Date:** 2026-06-21
**Goal:** rank for *high commercial-intent* UAE cybersecurity searches and convert that traffic into qualified leads (scoping calls, quotes).
**Companion to:** [SEO-GEO-AEO-AIO-AUDIT-2026-06.md](SEO-GEO-AEO-AIO-AUDIT-2026-06.md)

---

## 1. The principle: target *intent*, not just volume

A startup site cannot outrank Big-4 / global firms on broad heads like "cybersecurity" or "penetration testing". You win on **specific, high-intent, lower-competition long-tail** where the searcher is ready to buy and your UAE + named-practitioner + published-price angle is a genuine differentiator.

Intent ladder (prioritise top-down for lead gen):

| Stage | Example query | Page that should rank | Why it converts |
|---|---|---|---|
| **Transactional** | "penetration testing company UAE", "ISO 27001 certification cost Dubai" | Service detail page | Buyer-ready; pricing + CTA closes |
| **Commercial** | "best VAPT provider Abu Dhabi", "NESA compliance consultant UAE" | Service / hub page | Comparing vendors; trust signals win |
| **Informational** | "what is VAPT", "ISO 27001 vs NESA" | Blog / FAQ | Top-of-funnel; capture + nurture |

Your `keywords` *meta tag* is ignored by Google — the signals that rank are **title, H1, URL slug, first paragraph, headings, body copy, internal anchor text, and schema**. The recommendations below act on those.

---

## 2. Primary keyword map (money pages)

> Format: **Primary** (the one to win) · *secondary / variants to weave into H2s + body*

| Page | Primary keyword | Secondary keywords |
|---|---|---|
| `/services/offensive-security/web-application-penetration-testing` | **web application penetration testing UAE** | API pentest Dubai, OWASP testing UAE, web app security audit, business-logic testing |
| `/services/offensive-security/network-penetration-testing` | **network penetration testing UAE** | internal/external pentest Dubai, Active Directory pentest, VAPT UAE |
| `/services/offensive-security/vulnerability-assessment` | **vulnerability assessment UAE** | VA scan Dubai, vulnerability scanning SME UAE |
| `/services/offensive-security/phishing-simulation` | **phishing simulation UAE** | social engineering test Dubai, phishing test employees UAE |
| `/services/offensive-security/ptaas-subscription` | **penetration testing as a service UAE** | continuous pentest Dubai, PTaaS subscription |
| `/services/grc/iso-27001-implementation` | **ISO 27001 implementation UAE** | ISO 27001 certification Dubai, ISO 27001 consultant UAE, ISO 27001 cost |
| `/services/grc/iso-27001-gap-assessment` | **ISO 27001 gap assessment UAE** | ISO 27001 readiness Dubai, gap analysis |
| `/services/grc/nesa-uae-ia` | **NESA compliance UAE** | UAE IA V2 gap assessment, NESA consultant, SIA compliance |
| `/services/grc/uae-pdpl-advisory` | **UAE PDPL compliance** | PDPL consultant Dubai, data protection law UAE advisory |
| `/services/grc/risk-assessment-register` | **ISO 27005 risk assessment UAE** | risk register build, information security risk assessment |
| `/services/cloud-security/azure-cloud-security-assessment` | **Azure security assessment UAE** | Azure CIS benchmark review, Entra ID security Dubai |
| `/services/cloud-security/microsoft-365-security-review` | **Microsoft 365 security review UAE** | M365 security audit, Defender posture Dubai |
| `/services/network-infrastructure/firewall-network-security-review` | **firewall security review UAE** | FortiGate audit Dubai, network security review |
| `/services/network-infrastructure/security-architecture-review` | **security architecture review UAE** | network segmentation design, zero-trust architecture UAE |
| `/services/training-awareness/security-awareness-training` | **security awareness training UAE** | cybersecurity training Dubai, employee security workshop |
| `/services/training-awareness/tabletop-incident-response` | **tabletop incident response exercise UAE** | IR drill Dubai, incident response simulation |
| `/software` | **cybersecurity software reseller UAE** | SIEM/EDR/firewall supplier Dubai, security software UAE |
| `/` (home) | **cybersecurity company UAE** | cybersecurity services Abu Dhabi, VAPT & compliance UAE |

Your current titles/H1s already target most of these well (verified in the audit). The gaps are mainly **body depth + internal anchor text + AEO answer blocks**, covered below.

---

## 3. What's already strong (keep)

- Titles are keyword-front-loaded, UAE-localised, mostly ≤60 chars (3 fixed in Phase 1).
- Service pages carry **Service + FAQPage + Breadcrumb** schema → eligible for FAQ rich results and AI answers.
- Pricing in AED is published on service pages → huge for transactional intent + featured snippets.
- Named, certified practitioners (OSCP/CPTS/ISO LA) → the strongest trust + GEO differentiator; now in `/about` schema (Phase 2).

---

## 4. Conversion levers (turn rankings into leads)

1. **One primary CTA per page, repeated.** "Book a 30-min Scoping Call" already exists on service pages — ensure every money page has it **above the fold and again after the FAQ**. Hubs and `/software` should match.
2. **Price anchoring = qualification.** The AED ranges pre-qualify leads and cut tyre-kickers. Keep them visible; add "what changes the price" microcopy to reduce hesitation.
3. **Lead magnets for informational traffic.** Blog/hub visitors aren't ready to buy — offer a gated checklist (e.g. "UAE PDPL Compliance Checklist", "ISO 27001 Readiness Self-Assessment"). The `lead-magnet` component already exists in the layout CSS — wire it onto blog posts + hubs.
4. **Trust above the fold:** certifications, "named practitioners", "48-hour written quote", "free first retest" — these are conversion claims; surface them on hubs, not just detail pages.
5. **Reduce friction:** WhatsApp FAB + Calendly already present (good). Make sure the homepage `#contact` form is short (name, email, service, message) — every extra field drops conversion.
6. **Comparison pages convert mid-funnel buyers** ("VAPT vs pentest", "ISO 27001 vs NESA vs ADHICS") — they rank for research queries and route to the relevant service with a CTA.

---

## 5. AEO / AIO content pattern (apply to every money page)

For each page, the first on-page block should be an **answer-first definition** (40-60 words) that a search snippet or AI answer can lift verbatim, e.g.:

> *Web application penetration testing in the UAE is a manual security test of your web apps and APIs against the OWASP Top 10, run by OSCP/CPTS-certified testers. Underwings delivers it in 2-3 weeks from AED 12,000, with every finding manually validated and one free retest.*

Then: keyword-rich H2s, a comparison/pricing **table**, and the existing FAQ. This single pattern feeds Google snippets, AI Overviews, and ChatGPT/Perplexity citations simultaneously.

---

## 6. Recommended build order (content phase)

1. Add answer-first intro + FAQ to the **5 hubs**, homepage, `/about`, `/software` (most have FAQ on detail pages only).
2. Wire the **lead-magnet** onto blog posts + hubs; create 2 gated assets (PDPL checklist, ISO 27001 readiness).
3. Publish 3 **comparison articles** (VAPT vs pentest · ISO 27001 vs NESA vs ADHICS · black-box vs grey-box vs white-box).
4. Per-post blog `meta_title` (≤60) + named `author` (now wired into Article schema).
5. `llms-full.txt` mirroring full service copy for generative engines.
6. Google Business Profile: confirm NAP matches the new `ProfessionalService` schema exactly; collect first reviews → then add `AggregateRating`.

---

## 7. Measurement (so "rank top" is provable)

- **Google Search Console**: track impressions/clicks/position per primary keyword above; watch for AI-Overview impressions.
- **GA4**: goal = scoping-call bookings + form submits + WhatsApp clicks; attribute to landing page.
- **Monthly re-crawl** (Semrush/Ahrefs) to confirm technical issues stay closed.
- Target: each money page ranking page-1 for its **primary** within 3-6 months given the low-competition long-tail focus.
