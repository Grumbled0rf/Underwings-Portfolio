# Phase C — Proposal Generator (Design Spec)

> **Status:** Spec ready · implementation not started
> **Authoritative phase reference:** `UNDERWINGS-MASTER-PLAN.md` §7 / Phase C
> **Created:** 2026-05-21 · **Owner:** Manoj (build) · Reviewers: Nelson, Vinoth

---

## 1. Goal

Booked-discovery-call → signed-deal is fully automated through the
"Proposal Sent" stage of Krayin Pipeline 4.

**Today**: discovery call ends → principal manually drafts proposal in
Word/Drive → emails as PDF → tracks signature by checking inbox → moves
Krayin deal manually. Multi-hour, error-prone, easy to drop.

**After**: discovery call ends → principal fills a 90-second n8n form
(SKU + scope notes) → < 5 min later the lead has a Documenso-signable
PDF in their inbox → Krayin auto-moves to "Proposal Sent" → automated
follow-ups → on signature, deal → Won, Plane project provisioned,
kickoff email queued.

---

## 2. KPI + kill criterion (carried from master plan)

| Metric | Target | Floor |
|---|---|---|
| Proposal generated < 2h after scoping call ends | ≥ 80% of cases | < 50% |
| Manual edit time per generated proposal | < 30 min | sustained > 30 min for 3 weeks = template wrong |
| Time-to-signature (median) | < 5 business days | > 14 days = follow-up cadence wrong |
| Cost per generated proposal (Claude API) | < AED 8 | > AED 20 |

Phase C ships only when **all three of** the first three metrics are
above their respective floors for 2 consecutive weeks.

---

## 3. Architecture overview

```
[Discovery call ends]
       |
       v
[n8n internal form] -- principal fills SKU + scope (~90 sec)
       |
       v
[n8n workflow: 07-proposal-generator]
       |
   1. Load template       <-- templates/proposals/<sku>.md
   2. Load SKU pricing    <-- templates/skus.yml
   3. Claude API          <-- prompts/proposal-generation.md (cached)
                              renders proposal markdown
   4. md → PDF            <-- pandoc OR puppeteer-print
   5. Upload to Drive     <-- /clients/<company>/proposals/
   6. Create Documenso doc + signature request
   7. Brevo: send cover email with Documenso link
   8. Krayin: move deal to "Proposal Sent" (stage_id = 18)
       |
       v
[Wait for signature OR timer]
       |
       v
   3-day timer: not opened? auto-follow-up via Brevo
   7-day timer: not signed? Slack ping to #sales-pipeline
   On signature (Documenso webhook):
     - Krayin: move to Won (stage_id = 20)
     - Plane: create project from template
     - Brevo: kickoff email to client
     - Slack: announce in #client-success
```

---

## 4. Component breakdown

### 4.1 Documenso (self-hosted e-sign)

**Decision:** Documenso. Self-hosted. Reasons: cost (free), data
residency (UAE servers), no DocuSign per-envelope fee at ~20 deals/yr.

**Deployment:**
- Docker compose service `documenso` on the underwings stack.
- Subdomain: `sign.underwings.org`.
- Postgres backend (small, dedicated `documenso-db` container — do NOT
  share with Krayin's MariaDB).
- Webhook endpoint: `https://underwings.org/api/documenso/signed`
  proxied through underwings-nginx → n8n.
- SMTP via Stalwart (same pattern as Krayin).
- Auth: same SSO pattern as Plane (or HTTP basic for v1, tighten later).

**Estimate:** 1 person-day (deploy + DNS + SMTP test + webhook test).

### 4.2 Proposal templates

Location: `templates/proposals/`. One file per SKU.

Minimum set for v1 (matches the 6 active pricing SKUs):
- `pen-test-web.md`
- `pen-test-network.md`
- `pen-test-mobile.md`
- `iso-27001-implementation.md`
- `adhics-readiness.md`
- `pdpl-implementation.md`
- `ptaas-subscription.md`
- `continuous-compliance-subscription.md`
- `software-resale-generic.md`

**Template structure (every SKU follows the same skeleton):**
```markdown
# Proposal — {{ client_company }}
**Prepared by:** {{ practitioner_name }}, {{ practitioner_credentials }}
**Date:** {{ proposal_date }}
**Reference:** UW-{{ proposal_ref }}
**Valid for:** 30 days from proposal date

## 1. Your context (1 paragraph, Claude-drafted from scope notes)

## 2. What we'll deliver
- Bullet list of scope items — Claude expands from notes
- Each item: 1-line plain-English description

## 3. Approach (methodology, 3-5 bullets per SKU)
- These are mostly template-fixed per SKU
- Claude only adapts edge cases

## 4. Timeline (Gantt-style table — start, end, milestone)

## 5. Investment
| Line | Description | AED |
|---|---|---|
| 1 | {{ sku_line_1 }} | {{ sku_price_1 }} |
| ... | ... | ... |
| **Total** | | **{{ total_aed }}** |
*Excludes VAT. Excludes travel outside Abu Dhabi/Dubai.*

## 6. Acceptance criteria (per-SKU template-fixed)

## 7. What's not in scope (template-fixed + Claude adds 1-2 specifics)

## 8. Next steps
1. Sign this proposal (link below)
2. We invoice 30% within 5 business days; kickoff call scheduled
3. Delivery starts on {{ start_date }}

---
**Named delivery team:** {{ practitioners_assigned }}
**Underwings DPO:** dpo@underwings.org
```

**Estimate:** 2 person-days to write all 9 templates (Manoj for GRC/ADHICS/PDPL/CC, Nelson for pen-tests/PTaaS, Vinoth for network items, shared for software resale).

### 4.3 SKU price file

Location: `templates/skus.yml`. Single source of truth.

```yaml
- sku: pen-test-web
  name: "Web application penetration test"
  owner: nelson
  price_range_aed: [9000, 32000]
  default_aed: 14000
  lead_time_weeks: [2, 4]
  pipeline: 4

- sku: adhics-readiness
  name: "ADHICS v2 readiness assessment"
  owner: manoj
  price_range_aed: [22000, 65000]
  default_aed: 35000
  lead_time_weeks: [3, 6]
  pipeline: 4
# ... etc
```

**Estimate:** 0.5 person-day.

### 4.4 Claude prompt

Location: `prompts/proposal-generation.md`.

```
You are drafting a section of a fixed-price proposal for a UAE
cybersecurity engagement. Use British English. AED currency. Direct,
plain-spoken — no marketing fluff. No emojis.

You will receive:
- The full proposal template (cached — do not re-read)
- The SKU pricing line items (cached)
- The principal's freeform scope notes (~200-500 words)
- The client's company name and sector

Your output is JSON only:
{
  "client_context": "1 short paragraph reflecting back what they need",
  "scope_items": [
    {"item": "...", "description": "1-line plain English"},
    ...
  ],
  "out_of_scope_specifics": ["...", "..."],
  "start_date_suggestion": "YYYY-MM-DD (Mon-Fri only, +1 week from today)",
  "total_aed": 35000,
  "line_items": [
    {"description": "...", "aed": 28000},
    {"description": "Reporting + remediation Q&A", "aed": 7000}
  ]
}

Rules:
- Total AED must match sum of line_items.
- Each line item must be defensible — no padding.
- If the principal's notes are vague (< 100 words), set
  "needs_more_info": true and list what's missing.
- Never invent client information not in the notes.
```

**Model**: `claude-sonnet-4-6`. Prompt-cached on the template + SKU
table (saves ~90% on repeat runs).

**Estimate:** 1 person-day to write + tune (5 dry-run iterations with
real past engagements as test cases).

### 4.5 n8n workflow `07-proposal-generator`

Nodes (sketch):
1. **Webhook** — trigger from internal form (or Krayin "Scoping" → "Proposal Sent" stage move).
2. **Function** — validate input (required: krayin_lead_id, sku, scope_notes).
3. **HTTP** — GET Krayin lead + person + organization details (via webhook-lead-by-email.php or direct DB).
4. **Read File** — load `templates/proposals/<sku>.md` and `templates/skus.yml`.
5. **HTTP (Anthropic)** — Claude API call with prompt-cached system + variable user message.
6. **Function** — merge Claude JSON into template, render final markdown.
7. **Execute Command** — `pandoc -o proposal.pdf` (or call puppeteer sidecar — same pattern as the old scope-builder PDF sidecar, but resurrected for internal use only).
8. **HTTP (Drive)** — upload PDF + markdown to `/clients/<company>/proposals/<ref>.pdf`.
9. **HTTP (Documenso)** — POST `/api/v1/documents` to create signature envelope.
10. **HTTP (Brevo)** — send cover email with Documenso link.
11. **HTTP (Krayin)** — webhook-lead-update.php → move stage to "Proposal Sent" (18).
12. **Slack** — announce in `#sales-pipeline`.
13. **Wait nodes** — 3-day + 7-day timers (per workflow rules in master plan §11).

**Estimate:** 2 person-days (the highest-effort component).

### 4.6 Signature-received workflow `08-onboarding-kickoff`

Triggered by Documenso webhook on signature complete.

Nodes:
1. **Webhook** — Documenso → `/api/documenso/signed`.
2. **HTTP** — fetch signed PDF, archive to Drive.
3. **HTTP (Krayin)** — move stage to Won (20).
4. **HTTP (Plane)** — create project from template based on SKU.
5. **HTTP (Brevo)** — kickoff email to client (template per SKU).
6. **Slack** — announce in `#client-success`.

**Estimate:** 1 person-day. (Phase E will extend this with day-7/30/90 touchpoints.)

---

## 5. Total effort breakdown

| Component | Effort (person-days) |
|---|---|
| Documenso deployment | 1.0 |
| 9 proposal templates | 2.0 |
| `skus.yml` price file | 0.5 |
| Claude prompt + 5 dry-runs | 1.0 |
| n8n `07-proposal-generator` workflow | 2.0 |
| n8n `08-onboarding-kickoff` workflow | 1.0 |
| Smoke testing (3 real-shaped test runs) | 0.5 |
| Documentation + workflow notes | 0.5 |
| **Total** | **8.5 person-days** |

Realistic calendar: **2 weeks** at 1 principal × ~25 hours/week, or
**1 week** if Manoj is dedicated.

---

## 6. Risk register (Phase C specific)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claude generates wrong AED total (math error) | Medium | High (embarrassing) | Validate sum-of-line-items against total in n8n function node before PDF render; fail-fast to Slack if mismatch |
| Documenso webhook drops / arrives twice | Low | Medium | Idempotency: store last-seen Documenso event ID in Krayin custom field; skip duplicates |
| pandoc rendering breaks on edge-case template | Medium | Low | Catch in workflow; Slack alert; fall back to markdown attachment + manual PDF render |
| Client edits the AED in their head and signs anyway | Low | High (legal) | Documenso preserves audit trail; PDF is what they sign |
| SKU prices in `skus.yml` drift from website | Medium | Medium | Single source of truth: website reads from `skus.yml` at build time (refactor Phase D scope) |
| Scope notes too vague → Claude hallucinates | Medium | High | Prompt rule: if notes < 100 words, return `needs_more_info: true` and Slack ping; do not generate |
| Templates rot over time (services change) | High over 12 months | Medium | Phase K monthly review picks 1 template to re-validate against last delivered engagement |

---

## 7. Prerequisites + dependencies

Must be done before Phase C starts:
- ✅ Phase 0 (Krayin IDs)
- ✅ Phase 1 (inbound capture — to have leads to proposal)
- ✅ Phase 2 (scoring — so we know who's worth proposing to)
- ✅ Phase 3a (Cal.com booking)
- ✅ Phase 3b-i (pre-call brief — informs scope notes)
- ❌ **Phase B (measurement layer) — required for Phase C's KPI tracking**
- ⚠️ Slack workspace creation (for `#sales-pipeline`, `#client-success`)
- ⚠️ Documenso choice confirmed (open question 2 in master plan §13)

**Strict order recommendation:**
1. Phase A ritual cron (already implicit in Phase 9 weekly report — just add Monday checklist)
2. Phase B measurement layer (3 days)
3. Phase C proposal generator (8.5 days)

Total to "fully automated booked-call → signed deal": **~12 person-days from today**.

---

## 8. Out of scope for Phase C

Deliberately deferred to later phases:
- Day-7 / day-30 / day-90 client touchpoints → Phase E
- Subscription billing rail → Phase J (Open question 6)
- WhatsApp signature flow → Phase X
- Multi-language proposals (Arabic) → Phase X
- Multi-signer proposals → Phase X

Don't scope-creep these into Phase C.

---

## 9. Acceptance criteria

Phase C is "shipped" when **all** of these are true:
1. Documenso running at `sign.underwings.org` with healthy uptime alert.
2. All 9 SKU templates committed to `templates/proposals/`.
3. `templates/skus.yml` committed; website prices read from same file (or at minimum, divergence is documented and reconciled monthly).
4. n8n workflow `07-proposal-generator` deployed; tested with 3 real-shaped dry-runs ([TEST]-prefixed leads).
5. n8n workflow `08-onboarding-kickoff` deployed; tested with the signed dry-runs.
6. Krayin webhook `lead-update.php` extended to support stage transitions and signature events (or new webhook added).
7. Brevo cover-email template + 3-day / 7-day follow-up sequences live.
8. Plane has at least 3 project templates (one per major SKU type: project, subscription, resale).
9. KPI dashboard from Phase B shows "Time to proposal" and "Time to signature" tiles, both populated with real data.
10. At least 1 real signed engagement has gone through end-to-end (the first paying client will be the proof).

---

## 10. Open questions

1. **Documenso self-hosted vs DocuSign?** — Default to Documenso unless founder vetoes. *(Owner: Manoj.)*
2. **PDF rendering: pandoc vs puppeteer?** — Pandoc is lighter; puppeteer is what the old scope-builder used. *(Owner: Manoj — propose pandoc, fallback puppeteer if formatting suffers.)*
3. **`skus.yml` lives where?** — Repo root vs `templates/`. *(Owner: this spec — `templates/skus.yml`.)*
4. **Signature received: auto-move to Won, or require human confirmation?** — Recommend human confirmation for first 10 deals (one Slack button approval), auto after that. *(Owner: founder.)*
5. **What's the "invoice 30%" workflow?** — Out of scope here, but downstream automation needs it. *(Owner: founder — likely Phase X with subscription billing decision.)*

---

End of Phase C spec.
