# Proposal — {{ client_company }}
**Service:** Cybersecurity Software — Licensing + Deployment
**Prepared by:** Vinoth Samiyappa — CCNP, Fortinet NSE, Azure
**Date:** {{ proposal_date }}
**Reference:** UW-{{ proposal_ref }}
**Valid for:** 30 days from proposal date

## 1. Your context

{{ client_context }}

## 2. What we'll deliver

{{#scope_items}}
- **{{ item }}** — {{ description }}
{{/scope_items}}

## 3. Approach

We resell and deploy enterprise cybersecurity software — not box-shifting. Every engagement bundles licence procurement, deployment, and a 3-month operate phase so the tool is actually running, not just installed.

Vendors we work with (partner status varies by vendor — confirmed at engagement start):

| Category | Vendors |
|---|---|
| Endpoint / EDR | Sophos, SentinelOne, CrowdStrike (via partner) |
| Network / NGFW | Fortinet (FortiGate, FortiAnalyzer, FortiManager), Sophos |
| SIEM / SOAR | Securonix, Wazuh (open source) |
| VM scanning | Qualys, Rapid7, Tenable |
| Email security | Sophos, Mimecast (via partner) |
| Backup + DR | Veeam, Acronis |

1. **Requirements confirmation** — what's the actual problem, what's already in place, what's the user/site count, what's the integration surface.
2. **Vendor shortlist** — usually 2 vendors max. We'll tell you honestly which one wins for your situation (rebate quirks don't drive our recommendation).
3. **Quote** — vendor SKUs + our deployment + 3-month operate phase, separated so you can see the lines.
4. **Procurement** — we issue the PO to the vendor on your behalf, you pay us.
5. **Deployment** — on-site / remote / mixed depending on the product. Named engineer (Vinoth for most network/endpoint; sub-contracted UAE-based specialist for niche).
6. **Operate phase (3 months)** — tuning, exception handling, monthly review with your team, runbook handover.
7. **Hand-off** — runbook signed off, you operate; we're available on a separate operational subscription if needed.

## 4. Timeline

Varies by vendor — quoted in detail at engagement start. Typical:

| Activity | Weeks |
|---|---|
| Requirements + vendor shortlist | 1–2 |
| Quoting + PO + licence issuance | 1–3 (vendor-dependent) |
| Deployment | 2–6 (size-dependent) |
| Operate phase | 12 |

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes vendor licence cost — those are quoted separately and invoiced at vendor list price (we are transparent about our margin: we don't mark up vendor licences; our revenue is in deployment + operate, not arbitrage).*

**Vendor licence cost is added when we provide the formal quote in step 3 above.**

## 6. Acceptance criteria

- Licences activated against the agreed SKU quantities.
- Deployment milestones signed off per the project plan.
- Operate-phase monthly reviews held; runbook updated each review.
- Runbook handed over at end of operate phase; you can operate independently.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Hardware procurement (firewalls, appliances) — separate; we'll arrange via the vendor.
- 24×7 SOC operation (separate engagement — we partner with regional MSSPs for this).
- Custom integrations beyond what the vendor supports out-of-the-box.

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% of the deployment fee within 5 business days.
3. Requirements workshop scheduled within 1 week.
4. Vendor licence quote follows within 5 business days of that workshop.

{{> _shared-footer }}
