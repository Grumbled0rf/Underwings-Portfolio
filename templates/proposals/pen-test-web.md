# Proposal — {{ client_company }}
**Service:** Web Application Penetration Test
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

## 3. Approach

We run a **manual** penetration test — not an automated scan. Methodology:

1. **Reconnaissance** — passive + active discovery of the in-scope endpoints, subdomain enumeration, technology fingerprinting.
2. **OWASP Top 10 + ASVS Level 2** — full manual coverage. Authenticated and unauthenticated paths.
3. **Business logic** — multi-step flow abuse, IDOR, race conditions, state machine violations. This is where automated scanners miss the actual money-shot findings.
4. **Authentication & session** — credential stuffing surface, password reset edge cases, session fixation, MFA bypass, JWT handling.
5. **API endpoints** (if in scope) — REST + GraphQL surface, mass assignment, broken object-level authorisation.
6. **Reporting** — every finding with CVSS v3.1 score, PoC steps, screenshots, remediation guidance mapped to your stack.
7. **Retest** — one round of retest after you fix findings, included in this fee.

All testing is conducted from a static IP that we share with you on kickoff so you can whitelist us in your WAF / CDN.

## 4. Timeline

| Phase | Duration | Milestone |
|---|---|---|
| Kickoff + scoping confirmation | 2 business days | Test plan agreed in writing |
| Active testing | 5–10 business days | Daily status update; immediate Slack/Teams ping on any **High** or **Critical** finding |
| Report drafting | 3 business days | Draft report shared for factual review |
| Final report delivery | — | PDF + executive summary + remediation tracker (Excel) |
| Retest window | Within 30 days of final report | Retest results appended to the same PDF |

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes travel outside Abu Dhabi/Dubai (none expected for remote-friendly web testing).*

## 6. Acceptance criteria

- All in-scope endpoints listed in §2 have been tested against the OWASP Top 10 + ASVS L2.
- Every finding is reproducible from the report's PoC steps (we re-verify on retest).
- A **High** or **Critical** finding is reported within 4 business hours of discovery — out-of-band — not held for the final report.
- Final report is delivered no later than 3 business days after testing ends.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Social engineering of your staff (unless we explicitly added phishing simulation to this proposal).
- Denial-of-service or stress testing — we never run these against production without explicit written authorisation.
- Source code review of the application — we treat it as a black box unless you opt in to a separate SAST engagement.
- Remediation work itself (we recommend; your team or another vendor implements).

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% within 5 business days; kickoff call scheduled within 1 week of payment.
3. Active testing starts: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
