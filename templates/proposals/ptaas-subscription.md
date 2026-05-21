# Proposal — {{ client_company }}
**Service:** PTaaS — Continuous Penetration Testing
**Prepared by:** Nelson Durairaj — OSCP, CEH
**Date:** {{ proposal_date }}
**Reference:** UW-{{ proposal_ref }}
**Valid for:** 30 days from proposal date

## 1. Your context

{{ client_context }}

## 2. What we'll deliver

{{#scope_items}}
- **{{ item }}** — {{ description }}
{{/scope_items}}

## 3. How PTaaS works

Penetration Testing as a Service is not "we run the same test every year." It's **continuous testing on a rolling cadence** that adapts to your release schedule.

| Cycle | Active testing days | What's tested |
|---|---|---|
| Month 1 | 4 days | Baseline pentest — same depth as a traditional engagement |
| Month 2 | 2 days | Re-test of M1 fixes + delta on new releases |
| Month 3 | 2 days | Delta on new releases + 1 deep-dive area picked with you |
| Quarter-end | 1 day | Quarterly review: trends, recurring vuln classes, training recommendations |
| Repeat | | |

You get:
- **Findings within the cycle** — we don't sit on a critical for 11 months until "next year's pentest."
- **Slack/Teams channel** — direct line to Nelson during business hours.
- **Live findings portal** — every finding visible the day it's discovered, not buried in a PDF months later.
- **Quarterly executive summary** — for the board / ISO 27001 evidence / regulators.
- **Same named operator every cycle** — Nelson runs every test. No "different junior each year."

## 4. Pricing & terms

| Item | AED |
|---|---|
| Monthly subscription | **6,000 / month** |
| Trial (first month — paid, 30-day exit clause) | 6,000 |
| Initial setup (kickoff, scope, portal access) | included |
| Quarterly executive summary | included |
| Critical-finding response within 4 business hours | included |
| Re-test of fixes within 5 business days | included |

- 12-month term. Cancel after 30 days from start of trial month at no cost. After day 30, 30-day notice applies.
- Invoiced monthly in AED. First invoice on signature.

## 5. Acceptance criteria

- Active testing days delivered each month per the schedule above (we publish exact days a week in advance).
- Every critical/high finding reported in-channel within 4 business hours of discovery.
- Findings portal populated within 24 hours of discovery.
- Quarterly executive summary delivered within 5 business days of quarter-end.

## 6. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Social engineering (separate engagement).
- Denial-of-service / stress testing.
- Source code review (SAST is a separate engagement).
- Remediation work (we recommend; your team or another vendor implements).

## 7. Next steps

1. Sign this proposal via the link in the email.
2. We invoice month 1 (AED 6,000) within 2 business days; kickoff call within 5 days.
3. First active testing cycle begins: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
