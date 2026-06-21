# Comparison Article Drafts — for Supabase `blog_posts`

Three high-intent comparison posts that **don't duplicate** existing ones (you already have pentest-vs-VA and phishing-vs-awareness). Each is answer-first with a comparison table + FAQ — the pattern that wins featured snippets, Google AI Overviews, and ChatGPT/Perplexity citations.

**Paste into your CMS fields:** `title`, `meta_title` (≤60), `meta_description`, `excerpt`, `category`, `tags`, `author`, `content` (markdown). Set `published_at` when ready. Body is Markdown (your blog renders it via `marked`).

---

## ARTICLE 1

- **slug:** `iso-27001-vs-nesa-vs-adhics-uae`
- **title:** ISO 27001 vs NESA vs ADHICS: Which Compliance Framework Does Your UAE Business Need?
- **meta_title:** ISO 27001 vs NESA vs ADHICS UAE | Underwings
- **meta_description:** ISO 27001, NESA (UAE IA), and ADHICS compared for UAE businesses — who each applies to, what they cover, and how to comply with one implementation. UAE-specific guide.
- **excerpt:** ISO 27001 is voluntary and global; NESA/UAE IA is mandatory for UAE critical sectors; ADHICS is mandatory for Abu Dhabi healthcare. Here's exactly which applies to you — and how ~70% control overlap lets you implement once.
- **category:** Compliance
- **tags:** ISO 27001, NESA, ADHICS, UAE compliance, UAE IA V2
- **author:** Manoj Prabhakaran

**content:**
```markdown
**Short answer:** ISO/IEC 27001 is a *voluntary, international* information-security certification. NESA (the UAE Information Assurance Standard, "UAE IA") is *mandatory* for UAE government and critical-infrastructure entities. ADHICS is *mandatory* for healthcare providers in the Emirate of Abu Dhabi. Most UAE businesses need ISO 27001; regulated sectors need it **plus** NESA or ADHICS — and because the controls overlap heavily, you can implement once and evidence against all three.

## Quick comparison

| | ISO/IEC 27001:2022 | NESA / UAE IA V2 | ADHICS v2 |
|---|---|---|---|
| **Status** | Voluntary (often contractually required) | Mandatory | Mandatory |
| **Who it applies to** | Any organisation | UAE government & critical national infrastructure (energy, finance, telecom, transport) | Healthcare entities in Abu Dhabi (DoH-regulated) |
| **Issued / overseen by** | Accredited certification bodies | UAE Cyber Security Council / SIA | Abu Dhabi Department of Health (DoH) |
| **Outcome** | Certificate (3-year cycle + surveillance) | Compliance attestation / audit | Compliance attestation / audit |
| **Structure** | ISMS + Annex A (93 controls) | Management + technical controls, risk-based tiers | Governance + control domains aligned to healthcare |
| **Best for** | Demonstrating security to clients & partners globally | Meeting UAE regulatory obligation | Operating legally as an Abu Dhabi healthcare provider |

## Which one do you actually need?

- **A SaaS, fintech, or services company selling to enterprises** → ISO 27001. It's the credential clients and procurement teams ask for.
- **A government supplier or critical-infrastructure operator** → NESA / UAE IA is mandatory. ISO 27001 is a strong foundation that makes NESA faster.
- **A hospital, clinic, lab, or health-tech company in Abu Dhabi** → ADHICS is mandatory. Many also pursue ISO 27001 for commercial credibility.

## The efficiency: implement once, evidence three times

There is roughly **70% control overlap** between ISO 27001 Annex A, UAE IA V2, and PDPL/ADHICS requirements. A unified control set — one risk register, one set of policies, one evidence library — can be mapped against all applicable frameworks. This avoids running three separate compliance projects.

## How Underwings approaches it

We're the *implementer*, never the certifier (that separation is required by ISO/IEC 17021). We run a gap assessment, build the ISMS and risk register, configure controls in your systems, then map the evidence to every framework you're subject to. Typical SME ISO 27001 path: 4–6 months to certification readiness.

## FAQ

**Is ISO 27001 mandatory in the UAE?** No — it's voluntary, but frequently required by enterprise clients and tenders. NESA and ADHICS are the mandatory ones, for their respective sectors.

**Can one project cover ISO 27001 and NESA?** Yes — the control overlap means a single, well-structured implementation can satisfy both with mapped evidence.

**How long does ISO 27001 take in the UAE?** Typically 4–6 months for an SME, 6–9 months for larger or multi-site organisations.

*Need help deciding? [Book a 30-minute scoping call](/#contact) — we'll confirm which frameworks apply to your business and send a written plan within 48 hours.*
```

---

## ARTICLE 2

- **slug:** `black-box-vs-grey-box-vs-white-box-penetration-testing`
- **title:** Black-Box vs Grey-Box vs White-Box Penetration Testing: Which Should You Choose?
- **meta_title:** Black vs Grey vs White Box Pentest | Underwings
- **meta_description:** Black-box, grey-box and white-box penetration testing compared — access levels, cost, coverage, and when to use each. Practical guidance for UAE businesses.
- **excerpt:** The three pentest approaches differ by how much the tester knows before they start. Grey-box gives the best cost-to-coverage ratio for most businesses — here's why, with a side-by-side comparison.
- **category:** Penetration Testing
- **tags:** penetration testing, black box, grey box, white box, VAPT
- **author:** Nelson Durairaj

**content:**
```markdown
**Short answer:** The three differ by how much the tester knows up front. **Black-box** = no prior knowledge (outsider's view). **Grey-box** = limited knowledge plus valid user credentials (the best cost-to-coverage ratio for most apps). **White-box** = full knowledge including source code and architecture (deepest, highest-assurance). For most UAE businesses, grey-box is the right default.

## Side-by-side

| | Black-box | Grey-box | White-box |
|---|---|---|---|
| **Tester knowledge** | None | Partial + user credentials | Full (source, design, creds) |
| **Simulates** | External attacker | Compromised/authenticated user | Insider / worst-case |
| **Coverage** | Surface / perimeter | Broad, including auth'd flows | Deepest, line-of-code level |
| **Time & cost** | Lower | Moderate (best value) | Higher |
| **Best for** | Realism exercises, external exposure | Most web apps & APIs | High-assurance, regulated, critical apps |

## When to choose each

- **Black-box** — when you want to measure what a real external attacker could achieve with zero help, or for a realism/red-team-style exercise. Risk: time spent on reconnaissance is time not spent finding deeper bugs.
- **Grey-box (recommended default)** — testers log in as each user role, so they reach the authenticated functionality and business logic where most serious vulnerabilities live. Best balance of cost and coverage.
- **White-box** — when assurance matters most (payments, healthcare, critical infrastructure) and you can share source and architecture. Maximises depth and minimises blind spots.

## What doesn't change

Regardless of approach, a real penetration test is **manual** — a certified tester actively exploits and chains findings, validates every result, and delivers CVSS-scored, reproducible evidence with remediation guidance. That's the difference between a pen test and a vulnerability scan.

## How Underwings runs it

Grey-box is our default for web and API testing — we provision our own test accounts per role to maximise coverage without touching real user data. Black-box and white-box are available when the goal calls for them. Every engagement is OSCP/CPTS-led, with one free retest of critical and high findings within 30 days.

## FAQ

**Which is most cost-effective?** Grey-box — you skip the slow blind-reconnaissance phase and spend the budget on finding real vulnerabilities in authenticated functionality.

**Is white-box "better"?** It's the deepest, but only worth the extra cost when you genuinely need maximum assurance. For most apps, grey-box finds the issues that matter.

**Do compliance audits require a specific type?** No — ISO 27001, SOC 2, PCI DSS and NESA accept a properly scoped manual pen test; the report's rigour matters more than the box colour.

*Not sure which fits your app? [Book a scoping call](/#contact) — we'll recommend the right approach and quote it in writing within 48 hours.*
```

---

## ARTICLE 3

- **slug:** `uae-pdpl-vs-gdpr`
- **title:** UAE PDPL vs GDPR: Key Differences and What UAE Businesses Must Do
- **meta_title:** UAE PDPL vs GDPR: Key Differences | Underwings
- **meta_description:** UAE PDPL and GDPR compared — scope, consent, data-subject rights, cross-border transfers and penalties. What UAE businesses need to do to comply.
- **excerpt:** The UAE PDPL (Federal Decree-Law No. 45 of 2021) borrows heavily from GDPR but differs on scope, transfers and enforcement. If you already do GDPR, here's the gap to close for the UAE.
- **category:** Compliance
- **tags:** UAE PDPL, GDPR, data protection, privacy, compliance
- **author:** Manoj Prabhakaran

**content:**
```markdown
**Short answer:** The UAE Personal Data Protection Law (PDPL — Federal Decree-Law No. 45 of 2021) is modelled on GDPR and shares its core principles — lawful basis, data-subject rights, breach handling — but differs in territorial scope, cross-border transfer rules, and enforcement. If you're already GDPR-compliant you have a strong head start, but you must still map controls to PDPL specifically.

## Comparison

| | UAE PDPL | GDPR |
|---|---|---|
| **Applies to** | Processing of personal data of UAE residents (with free-zone nuances, e.g. DIFC/ADGM have their own laws) | Processing of EU residents' data, wherever the processor is |
| **Lawful basis** | Consent-centric, with defined exceptions | Six lawful bases incl. legitimate interest |
| **Data-subject rights** | Access, correction, erasure, restriction, portability, objection | Broadly the same set |
| **Cross-border transfers** | Allowed to countries with "adequate" protection, or with safeguards/consent | Adequacy decisions, SCCs, BCRs |
| **DPO** | Required in defined high-risk cases | Required in defined cases |
| **Regulator** | UAE Data Office | National DPAs |

## What UAE businesses must do

1. **Map your data** — what personal data you hold, where, why, and who you share it with (a Record of Processing Activities).
2. **Establish lawful basis & consent** — capture and manage consent where required.
3. **Honour data-subject rights** — a process to handle access, correction, and erasure requests within the required timeframes.
4. **Secure the data** — appropriate technical and organisational measures (this is where ISO 27001 controls map directly).
5. **Plan for breaches** — detection, assessment, and notification procedures.
6. **Govern cross-border transfers** — verify destinations and safeguards.

## The overlap with ISO 27001

PDPL's security obligations map cleanly onto ISO 27001 Annex A. If you're building or hold an ISMS, much of the PDPL technical requirement is already evidenced — you add the privacy-specific governance (consent, rights handling, RoPA, transfer controls) on top.

## How Underwings helps

We run a PDPL gap assessment against your current state, produce a prioritised remediation roadmap, and — where you also pursue ISO 27001 or NESA — deliver a unified control set so you implement once and evidence against all of them.

## FAQ

**Does GDPR compliance mean I'm PDPL-compliant?** No, but you're close. You still need to map to PDPL's specific scope, consent model, and transfer rules.

**Who enforces the UAE PDPL?** The UAE Data Office, with executive regulations defining specifics.

**Do free-zone companies follow PDPL?** It depends — DIFC and ADGM operate their own data-protection laws; mainland and most other zones fall under the federal PDPL. We confirm which applies during scoping.

*Need a PDPL readiness check? [Book a scoping call](/#contact) — written gap analysis and plan within 48 hours.*
```

---

### Publishing notes
- Set a unique `meta_title` (≤60 chars) — already provided above; this also resolves the blog "too-long title" crawl items.
- Set `author` to the named team member (now rendered as a `Person` in the Article schema → E-E-A-T signal).
- Add 1 internal link from each new post to the matching service page, and link the relevant hub back to these posts (helps de-orphan deep pages).
