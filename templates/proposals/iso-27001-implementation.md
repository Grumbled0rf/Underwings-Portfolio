# Proposal — {{ client_company }}
**Service:** ISO/IEC 27001:2022 Implementation
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

This is **implementation, not advisory**. We don't hand over a 200-page policy stack and disappear. We work alongside your team to get the controls actually operating.

1. **Gap assessment** — current-state review against ISO 27001:2022 Annex A controls + clauses 4-10. Output: gap register with severity, effort estimate per gap, prioritisation.
2. **Scope definition (clause 4.3)** — statement of applicability (SoA), drafted with you, signed off by leadership.
3. **Risk management (clause 6.1)** — risk register methodology + populated initial register. Aligned with ISO 27005.
4. **Policy stack** — 14 mandatory policies, tailored to your business (not generic templates). Cross-referenced to Annex A controls.
5. **Control implementation** — we work with your team on the actual operational changes (access reviews, asset register, supplier contracts, training records, etc.).
6. **Internal audit (clause 9.2)** — we run a full internal audit before you call in the certification body, mapped to a real auditor's checklist. Mandatory for certification readiness.
7. **Management review (clause 9.3)** — first management review run with leadership; template + meeting kit handed over.
8. **Certification handover** — we attend the Stage 1 + Stage 2 audits with you (advisory role only — we cannot audit and certify). Three certification bodies recommended based on your sector + budget.

## 4. Timeline

| Phase | Weeks | Milestone |
|---|---|---|
| Gap assessment + SoA | 2 | Signed-off scope and SoA |
| Risk register + policy stack | 3–4 | Risk register populated; all 14 policies approved |
| Control implementation | 6–10 | Quarterly milestones; all Annex A applicable controls operating |
| Internal audit | 1 | Internal audit report |
| Management review | 1 | Management review minutes signed |
| **Certification readiness** | — | You can confidently call in a CB |
| Stage 1 + Stage 2 attendance | as scheduled by CB | Advisory presence at both audits |

Realistic end-to-end calendar: **4–6 months** for an SME (< 100 staff). 6–9 months for larger organisations.

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes certification body fees (paid separately by you to the CB — typically AED 25,000–60,000 depending on CB choice and organisation size).*

## 6. Acceptance criteria

- All 14 mandatory ISO 27001 documents in place, version-controlled, signed off.
- Risk register populated with at least 12 risks (or your actual risk count if higher), each with treatment decision recorded.
- Internal audit completed with audit report.
- Management review held with minutes recorded.
- You can answer "where is the evidence for control X?" for every applicable Annex A control.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Certification body fees (paid by you directly to the CB).
- Penetration testing — control A.8.29 requires pen testing as evidence, but the pen test itself is a separate engagement (we can quote that alongside).
- Tool licences (your existing GRC tool, evidence repository, ticketing).
- Ongoing operation after certification — see our Continuous Compliance subscription if you'd like us to keep evidence current.

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% within 5 business days; kickoff workshop in week 1.
3. Gap assessment begins: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
