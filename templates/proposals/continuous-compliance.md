# Proposal — {{ client_company }}
**Service:** Continuous Compliance Subscription
**Prepared by:** Manoj Prabhakaran — ISO 27001 Lead Auditor, CPTS
**Date:** {{ proposal_date }}
**Reference:** UW-{{ proposal_ref }}
**Valid for:** 30 days from proposal date

## 1. Your context

{{ client_context }}

## 2. What we'll deliver

{{#scope_items}}
- **{{ item }}** — {{ description }}
{{/scope_items}}

## 3. How Continuous Compliance works

Most companies pass the certification audit, then quietly let the controls rot for 11 months until the next surveillance audit panics them. We exist to stop that.

| Cadence | Activity |
|---|---|
| **Monthly** | Evidence collection sprint — we pull your access reviews, change logs, training records, incident records, supplier reviews into your evidence repository. Gaps flagged in-channel. |
| **Monthly** | 30-minute working session with your nominated owner — what's overdue, what's about to lapse, what's blocked. |
| **Quarterly** | Internal audit-style spot review — we randomly sample 8–12 controls against the standard. Findings logged like a real auditor would. |
| **Quarterly** | Management review pack — we prepare the agenda + data for your management review meeting. You run the meeting; we hand over signed minutes. |
| **Pre-surveillance audit** | Two-week intensive prep — we close anything outstanding before the CB lands. |

You get:
- **No surprises at audit time** — you arrive at surveillance audit with evidence in date order, controls operating.
- **Same named lead** — Manoj runs every cycle. No handover loss.
- **Slack/Teams channel** — direct line during business hours.
- **Evidence repository hygiene** — your existing tool (Drata, Vanta, SharePoint, file share — we work with whatever you have).
- **Standard coverage** — ISO 27001 always; ADHICS / NESA / PDPL on request at no extra cost (if those are already in your SoA).

## 4. Pricing & terms

| Item | AED |
|---|---|
| Monthly subscription | **4,000 / month** |
| Trial (first month — paid, 30-day exit clause) | 4,000 |
| Onboarding (evidence map, repository walkthrough, owner assignment) | included |
| Quarterly internal audit-style review | included |
| Pre-surveillance audit prep | included once per 12-month cycle |
| 1-hour Slack/Teams responsiveness during business hours | included |

- 12-month term. Cancel after 30 days from start of trial month at no cost. After day 30, 30-day notice applies.
- Invoiced monthly in AED. First invoice on signature.

## 5. Acceptance criteria

- Monthly evidence collection sprint delivered (status report sent on the last business day of each month).
- Quarterly internal-audit-style review delivered with findings logged.
- Management review pack delivered 5 business days before your scheduled review meeting.
- All overdue evidence / control gaps surfaced within 24 hours of discovery.

## 6. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Acting as your certification auditor (regulatory — we cannot certify what we implement/maintain).
- Penetration testing (separate engagement or our PTaaS subscription).
- New regulatory work — if a new standard comes into scope mid-term (e.g., DESC adds a control set), we'll re-scope.
- Tool licences (your existing GRC / evidence platform).

## 7. Next steps

1. Sign this proposal via the link in the email.
2. We invoice month 1 (AED 4,000) within 2 business days; onboarding workshop within 5 days.
3. First monthly sprint begins: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
