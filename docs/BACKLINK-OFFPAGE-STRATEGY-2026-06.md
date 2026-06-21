# Underwings.org — Backlink / Off-Page SEO & Submission Strategy

**Date:** 2026-06-21
**Owner:** Marketing / IT
**Companion doc:** [SEO-GEO-AEO-AIO-AUDIT-2026-06.md](SEO-GEO-AEO-AIO-AUDIT-2026-06.md) — this doc covers **off-page** (links, citations, mentions); the audit covers **on-page + technical**. They share three hooks: `sameAs` (§2.3 of the audit), `LocalBusiness` + Google Business Profile (§2.5 / §4), and NAP consistency.

---

## 0. Verdict (TL;DR)

Underwings is a young UAE cybersecurity firm. Off-page, the goal is **not** raw link volume — it is **entity trust and local relevance**:

1. **Lock NAP** (Name / Address / Phone) to one canonical form, then propagate it identically everywhere. Inconsistent NAP is the single biggest local-SEO killer.
2. **Citations before links.** Win the structured business listings (Google Business Profile + UAE directories) first — they feed both the map pack and the Knowledge Graph entity that `sameAs` points at.
3. **Relevance over DA.** One link from a UAE chamber, a Microsoft/Fortinet partner page, or a cybersecurity publication is worth more than fifty generic directory links.
4. **Slow and clean.** A 2-year-old domain that suddenly gains 500 directory links looks like spam. Target a steady, defensible profile, not a spike.
5. **Earn, don't buy.** No PBNs, no link farms, no paid-link networks, no comment spam. For a security company, a toxic backlink profile is also a *reputational* liability.

> **Blocker to resolve first:** there is **no street address** in the codebase (llms.txt says only "Abu Dhabi, UAE") and **two phone numbers** appear in source (`+971 50 567 0394` and `+971 54 707 8203`). You cannot start citations until you pick **one** canonical address + **one** primary phone. See §1.

---

## 1. Canonical NAP block (decide this first — everything depends on it)

Every listing, profile, footer, and schema must use **byte-identical** values. Fill the blanks and freeze them:

```
Business name:   Underwings Cybersecurity Solutions
                 (legal entity may be "Underwings Technologies" — see note)
Address line 1:  __________________________  ← MISSING. Required for GBP + UAE directories.
Address line 2:  __________________________
City:            Abu Dhabi
Emirate:         Abu Dhabi
Country:         United Arab Emirates
P.O. Box:        __________________________  (common/expected in UAE listings)
Primary phone:   +971 50 567 0394            ← confirm: this is the tel: link in source
Secondary phone: +971 54 707 8203            (use only in "additional phone" fields)
Email:           contact@underwings.org
Website:         https://underwings.org
```

**Name note:** the public brand is "Underwings Cybersecurity Solutions" and the LinkedIn slug is `underwings-cybersecurity`. Pick the **exact legal/trade-license name** as the NAP business name (directories cross-check against the trade license) and treat "Underwings Cybersecurity Solutions" as the brand display name. Document which is which here once confirmed.

**Description blurbs** (reuse verbatim — consistency is a trust signal):

- **Short (≈150 char):**
  `UAE-based cybersecurity firm in Abu Dhabi. Penetration testing (OSCP/CPTS), ISO 27001/NESA/PDPL compliance, cloud & network security. Manual, certified.`

- **Medium (≈300 char):**
  `Underwings is an Abu Dhabi cybersecurity services company delivering offensive security (network & web app penetration testing, phishing simulation), cloud security (Azure, Microsoft 365), network & infrastructure hardening, and GRC (ISO 27001:2022, NESA/UAE IA V2, UAE PDPL). Work is performed by named, certified practitioners — not automated scans.`

- **Categories to claim where offered:** Computer Security Service, IT Security Service, Information Technology Consultant, Business Management Consultant, Software Company.

---

## 2. Phased plan

### Phase 1 — Foundation citations (week 1–2, highest ROI)
The structured "business listing" tier. These directly power the UAE map pack and the entity Google attaches `sameAs` to.

1. **Google Business Profile** — *the* priority. Without it, no map-pack ranking. Needs the real address (§1); choose Service-Area Business if you don't take walk-ins. Verify by postcard/phone. Add services, photos, the medium blurb, and the booking link.
2. **Bing Places** (imports from GBP) + **Apple Business Connect**.
3. **LinkedIn Company Page** — already exists (`/company/underwings-cybersecurity`); make sure NAP, website, and "About" match §1 exactly.
4. UAE general business directories (Tier-1 list in §3).

### Phase 2 — Industry & partner links (week 3–6)
Relevance-rich links that also serve as trust/credential proof.

5. **Vendor partner directories** — if Underwings is a Microsoft / Fortinet / (CIS / ISO body) partner or reseller, get listed in their partner locators. These are high-authority, topically perfect links and double as sales proof.
6. **Certification / membership bodies** — UAE chambers of commerce, security industry associations (see §3 Tier-3).
7. **B2B service marketplaces** — Clutch, GoodFirms, DesignRush (cybersecurity category). These rank for "cybersecurity company UAE" and drive qualified leads.

### Phase 3 — Editorial & content links (ongoing)
The hardest and most valuable tier; earns links instead of submitting them.

8. **Digital PR** — pitch UAE tech/business press with original data (PDPL readiness stats, regional breach trends). The audit (§4) already recommends cite-able stats — repurpose them as a press angle.
9. **Guest posts / expert commentary** — contribute to UAE IT publications and global security blogs; author bylines link back and build the named-practitioner E-E-A-T the audit wants.
10. **Resource-page & "best cybersecurity companies in UAE" listicles** — outreach to get added.

### Phase 4 — Maintain & monitor (ongoing)
11. Quarterly NAP audit (catch drift across listings).
12. Backlink monitoring + disavow review (§6).

---

## 3. Target sources (tiered, prioritized)

> Verify each is live and not pay-to-spam before submitting. DA shown is indicative; **relevance and editorial standards matter more than DA**. Track progress in a submission sheet (columns: Source · URL · Tier · Login · Submitted · Live URL · NAP-verified).

### Tier 1 — Core business citations (do all)
| Source | Why | Notes |
|---|---|---|
| Google Business Profile | Map pack + Knowledge Graph anchor | Needs real address; verify |
| Bing Places | Second search engine + Copilot | Import from GBP |
| Apple Business Connect | Apple Maps / Siri | Free |
| LinkedIn Company Page | Entity + B2B reach | Exists — align NAP |
| Crunchbase | Startup entity, strong `sameAs` target | Free profile |
| Clutch.co | B2B cybersecurity buyers + ranks UAE queries | Encourage 1–2 real client reviews |
| GoodFirms | Same intent as Clutch | Free tier |

### Tier 2 — UAE / GCC business directories
| Source | Notes |
|---|---|
| Yellow Pages UAE (yellowpages.ae) | Standard UAE citation |
| Connect.ae | UAE business listings |
| TradersFind.com | UAE B2B directory |
| UAE-business-directory.com / Dubai-online.com | General UAE |
| Hidubai.com | Strong Dubai/UAE local signal |
| Yelloyello / Cybo / Tuugo (UAE) | Aggregator citations (low effort) |
| **Chamber of Commerce** (Abu Dhabi / Dubai) | If a member — high trust, do this |
| Local economic-zone / free-zone member directory | If licensed in a free zone, claim the member listing |

### Tier 3 — Cybersecurity / IT industry
| Source | Notes |
|---|---|
| Microsoft Partner / Solutions Finder | If a registered Microsoft partner — high authority |
| Fortinet partner locator | If a Fortinet partner |
| Cybersecurity vendor/MSSP listicles ("top cybersecurity companies UAE") | Outreach to be added |
| The Cyber Express / regional security media directories | Editorial |
| GISEC / regional security event exhibitor pages | If exhibiting — strong relevance link |
| ISO certification body client list / case study | If certified or a client is |
| G2 / Capterra | Only if §/software product qualifies |

### Tier 4 — Global authority profiles (entity + `sameAs`)
LinkedIn (have), Crunchbase, **X/Twitter** (create if missing — referenced by `twitter:card` but no profile linked), Facebook/Meta business page, YouTube (if video), GitHub org (credible for a security firm), Instagram (have: `underwings.uae`). These become the `sameAs` array — see §5.

### Avoid / low-value
- Generic "free 1000 backlinks" / auto-submit packages — toxic, can trigger penalties.
- Article-spinning networks, blog-comment / forum-profile spam, fiverr link gigs.
- Foreign-language directories with no UAE/security relevance.
- Reciprocal "link exchange" schemes.

---

## 4. Anchor text & link guidance

A natural profile is **mostly branded**. Over-optimized exact-match anchors are a spam signal.

| Anchor type | Target share | Examples |
|---|---|---|
| Branded | ~50–60% | "Underwings", "Underwings Cybersecurity", "underwings.org" |
| Naked URL | ~15–20% | `https://underwings.org` |
| Generic | ~10% | "visit website", "learn more" |
| Partial / topical | ~10–15% | "Abu Dhabi penetration testing firm", "ISO 27001 consultants in the UAE" |
| Exact-match | <5% | "penetration testing UAE" (use sparingly, only on the relevant deep page) |

- **Deep-link**, don't just point everything at the homepage. Send relevant links to the matching service page (e.g. a PDPL article link → `/services/grc/uae-pdpl-advisory`). This also helps the audit's §1.3 orphan problem.
- Directory links are usually `nofollow` — that's **fine**; they still build citation consistency and referral traffic. Don't chase only dofollow.

---

## 5. Wire-up to the audit (`sameAs` + LocalBusiness)

Once profiles exist, close the audit's open schema gaps so the links actually consolidate into the Knowledge-Graph entity:

1. **`sameAs`** on the `Organization`/`LocalBusiness` node ([Layout.astro](../frontend/src/layouts/Layout.astro)) — array of the live profile URLs:
   ```
   sameAs: [
     "https://www.linkedin.com/company/underwings-cybersecurity",
     "https://www.instagram.com/underwings.uae",
     "https://www.crunchbase.com/organization/…",   // once created
     "https://clutch.co/profile/underwings…",        // once created
     "https://twitter.com/…"                         // once created
   ]
   ```
2. **`LocalBusiness` / `ProfessionalService`** node with the §1 NAP, `geo` (Abu Dhabi lat/long), `areaServed: AE`, `priceRange` — must match every external citation byte-for-byte.
3. **GBP review link** → feeds the `AggregateRating`/`Review` work in audit §2.4 (only with genuine, attributable reviews).

NAP in schema, in the site footer, and in every external citation must be **the same strings**. Mismatch dilutes the entity.

---

## 6. Measurement & maintenance

- **Baseline now:** export current referring domains (Search Console → Links, plus Semrush/Ahrefs if available) before you start, so you can show lift.
- **KPIs:** referring domains (quality, not count), map-pack visibility for "cybersecurity company Abu Dhabi / UAE", GBP views/calls/direction-requests, referral sessions from citations, branded-search volume.
- **Cadence:** Phase 1 within 2 weeks; re-audit NAP consistency quarterly; review new backlinks monthly for spammy/negative-SEO links and disavow only the clearly toxic ones.
- **Velocity:** aim for a steady trickle (a handful of quality links/month), never a bulk dump.

---

## 7. Open decisions (need answers before execution)
1. **Real street address + P.O. Box** for Abu Dhabi — required for GBP and UAE directories. (§1)
2. **One primary phone** — confirm `+971 50 567 0394` is canonical; what is `+971 54 707 8203` for? (§1)
3. **Legal/trade-license name** — is it "Underwings Technologies" or "Underwings Cybersecurity Solutions"? Directories verify against the license. (§1)
4. **Partner status** — registered Microsoft / Fortinet partner? Unlocks the highest-value Tier-3 links. (§3)
5. **Chamber / free-zone membership** — which authority is the trade license under? (§3 Tier-2)
6. **Real client reviews** available to attribute on Clutch/GBP? (gates §3 + audit §2.4)
7. **Create X/Twitter + Crunchbase profiles?** Needed to populate `sameAs`. (§4 Tier-4 / §5)
