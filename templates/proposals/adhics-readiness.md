# Proposal — {{ client_company }}
**Service:** ADHICS v2 Readiness Assessment
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

ADHICS v2 (Abu Dhabi Healthcare Information & Cyber Security Standard) is the **mandatory** standard for healthcare entities operating in the Emirate of Abu Dhabi, issued by DoH. Non-compliance is a regulatory risk. We've delivered ADHICS work for hospitals, day-care centres, diagnostic labs, and clinical groups.

1. **Scope confirmation** — which entities, facilities, and information assets are in scope. ADHICS applies entity-wide; we map your org structure to the standard's scope rules.
2. **Gap assessment** — current state assessed against ADHICS v2 controls (Governance, Asset Management, HR Security, Physical & Environmental, Access Control, Operations, Communications, Third-Party Risk, Incident Management, BCM, Compliance). All 19 control families.
3. **Severity + prioritisation** — every gap rated Critical / High / Medium / Low with rationale, remediation effort estimate, and dependency mapping (which gaps must close before others).
4. **Remediation roadmap** — quarterly milestone plan with named owners (your staff), evidence requirements, and DoH audit-readiness checkpoints.
5. **Quick wins** — usually 8–12 controls that can close in the first 30 days (asset inventory, access review, USB / removable media policy, etc.). We flag these explicitly so you show progress fast.
6. **Evidence catalogue** — what artefacts DoH will want to see at audit, with templates / examples per control where helpful.
7. **Executive briefing** — board-level summary deck (10–12 slides) you can take to leadership.

## 4. Timeline

| Phase | Weeks | Milestone |
|---|---|---|
| Kickoff + scope confirmation | 1 | In-scope entities + facilities locked |
| Document review + interviews | 2–3 | Stakeholder interviews complete (typically CISO/CIO, Quality, HR, Facilities, Clinical IT) |
| Gap analysis + scoring | 1–2 | Gap register draft |
| Roadmap drafting | 1 | Quarterly remediation plan |
| Final deliverables + briefing | 1 | Final report + exec deck + Q&A session |

Realistic calendar: **4–8 weeks** for SME healthcare entities. 8–12 weeks for larger facilities.

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes any DoH-related submission fees (none typical at the readiness stage).*

## 6. Acceptance criteria

- Gap register covers all 19 ADHICS v2 control families.
- Each gap has: severity, evidence of current state, remediation step(s), owner role, effort estimate, dependency chain.
- Executive deck delivered + 1-hour Q&A session with leadership.
- Roadmap is implementable by your team — no "engage external consultant" hand-waving for the basics.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- The actual remediation work itself (separate engagement — we can quote phase 2 once you've decided priorities).
- Penetration testing or vulnerability assessments — usually recommended after major remediation; separate engagement.
- DoH licensing or accreditation submissions (regulatory consultancy, not our scope).
- DPDPL implementation work — separate proposal available; the two often run in parallel.

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% within 5 business days; kickoff workshop in week 1.
3. Active assessment begins: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
