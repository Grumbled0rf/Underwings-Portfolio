# Proposal — {{ client_company }}
**Service:** Network Penetration Test
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

Network penetration testing — **manual exploitation**, not just port scanning.

1. **External recon** — passive OSINT on your perimeter, certificate transparency log scraping, DNS zone walking, exposed cloud surface (S3, Blob, GCS).
2. **Active service enumeration** — version fingerprinting, banner grabbing, attack-surface mapping. Cross-referenced against current CVE feeds.
3. **Manual exploitation** — chained vulnerabilities, default credentials, mis-configured services (SMB, RDP, SSH, FTP, exposed databases, MQ brokers, K8s control planes).
4. **For internal engagements** — assumed-breach starting point (you give us a low-privilege VPN account or a laptop inside the segment). We perform AD enumeration, kerberoasting/ASREP-roasting, lateral movement, segmentation-bypass validation, domain admin path mapping.
5. **For cloud-adjacent networks** — Azure AD / Entra ID surface from a network-adjacent attacker view (federation abuse, conditional access bypass).
6. **Reporting** — every finding with CVSS v3.1, exploitation PoC, network diagram of the attack path, remediation guidance.
7. **Retest** — one retest after you fix findings, included.

Source IP for external testing is shared at kickoff for WAF / IPS allowlisting.

## 4. Timeline

| Phase | Duration | Milestone |
|---|---|---|
| Kickoff + rules of engagement | 2 business days | RoE signed; allowlist confirmed |
| Active testing | 7–14 business days (varies by scope) | Daily status; immediate ping on **High**/**Critical** |
| Report drafting | 3 business days | Draft for factual review |
| Final report delivery | — | PDF + executive summary + remediation tracker |
| Retest window | Within 45 days | Retest results appended |

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes travel outside Abu Dhabi/Dubai (internal engagements typically need 2–4 days on site — Abu Dhabi/Dubai locations only at this price).*

## 6. Acceptance criteria

- All in-scope ranges / hosts have been tested against the agreed methodology.
- Every finding is reproducible from PoC steps and re-verified on retest.
- **High** or **Critical** finding reported within 4 business hours of discovery — out-of-band.
- Final report delivered no later than 3 business days after testing ends.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- Social engineering of staff (separate engagement available).
- Denial-of-service / volumetric stress testing — never run without explicit written authorisation.
- Hardening / configuration changes — we recommend; your team implements.
- Penetration testing of third-party SaaS you don't control (we'll flag, not test).

## 8. Next steps

1. Sign this proposal via the link in the email.
2. We invoice 30% within 5 business days; kickoff call within 1 week.
3. Active testing starts: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
