# Proposal — {{ client_company }}
**Service:** UAE PDPL Implementation
**Prepared by:** Manoj Prabhakaran — ISO 27001 Lead Auditor, CPTS, Azure Security
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

The **UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021)** is enforced by the UAE Data Office. We implement compliance — not just policies on paper.

1. **Data mapping** — interview your business owners and technical teams to map every personal-data flow: collection point, processing purpose, retention period, recipients, cross-border transfers.
2. **Record of Processing Activities (RoPA, Article 14)** — populated, versioned, owner-tagged register. Living document handed over with a maintenance process your team can run quarterly.
3. **Data Protection Impact Assessments (DPIA, Article 18)** — DPIA methodology + completed DPIAs for the high-risk processing activities your data map surfaces.
4. **Privacy policies** — external (website, app) + internal (employee, retention, breach response). Specific to UAE PDPL — not GDPR copies.
5. **Data subject rights workflow** — operational process for handling access, deletion, correction, portability, objection requests within the statutory 30-day window. We hand over a runnable workflow, not just a policy.
6. **Data Protection Officer (DPO) guidance** — Article 10 requires a DPO in many cases. We help you decide whether to appoint internally or outsource, and brief whoever gets the role.
7. **Cross-border transfer assessment** — Article 22 imposes specific obligations for transfers outside the UAE. We map your existing transfers (cloud providers, SaaS, group entities) and document the lawful basis for each.
8. **Breach notification readiness** — incident-response process aligned with the PDPL's notification timelines.
9. **Awareness training** — half-day workshop for staff handling personal data + recorded version for ongoing onboarding.

## 4. Timeline

| Phase | Weeks | Milestone |
|---|---|---|
| Kickoff + data mapping interviews | 2 | Data map draft |
| RoPA + DPIAs | 2–3 | Signed-off RoPA, completed DPIAs for high-risk activities |
| Policy stack | 1–2 | All 6 policies approved |
| Data subject rights workflow | 1 | Workflow runnable in your ticketing/CRM |
| DPO + transfers + breach readiness | 1–2 | Decision recorded; lawful basis docs in place |
| Awareness training | 0.5 | Workshop run + recording delivered |

Realistic calendar: **8–12 weeks** for mid-size organisations.

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT.*

## 6. Acceptance criteria

- RoPA covers every personal-data processing activity discovered in data mapping.
- DPIA completed for every "high risk" processing identified (Article 18 criteria).
- 6 policies signed off and published.
- Data subject rights workflow demonstrably runnable end-to-end with a test request.
- Cross-border transfer lawful-basis documented for every flow.
- Awareness training delivered + recording available.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Acting as your DPO long-term (separate engagement — we offer outsourced DPO as a subscription).
- Legal advice on contracts, vendor terms, or M&A privacy due diligence (we recommend qualified UAE counsel for these).
- GDPR-specific work (we can map UAE PDPL ↔ GDPR but full GDPR is a separate engagement).
- Technical implementation of consent management platforms (CMP) or data subject request portals — we recommend tools; deployment by you or a third party.

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% within 5 business days; kickoff workshop in week 1.
3. Data mapping interviews begin: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
