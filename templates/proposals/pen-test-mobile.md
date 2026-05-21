# Proposal — {{ client_company }}
**Service:** Mobile Application Penetration Test
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

Mapped to **OWASP MASVS** and **MASTG**. We perform both static and dynamic analysis on iOS and/or Android builds.

1. **Static analysis** — reverse-engineering the binary (Hopper / Ghidra / jadx), checking for hardcoded secrets, weak crypto, insecure logging, root/jailbreak detection bypass.
2. **Dynamic analysis** — runtime instrumentation with Frida, MITM proxy (Burp/Proxyman), checking transport security, certificate pinning bypass, IPC abuse, deep-link exploitation.
3. **Local data storage** — SQLite, shared preferences, KeyChain / Keystore usage. Insecure-by-default OS APIs.
4. **Authentication & session** — token handling, biometric bypass, session lifecycle, refresh-token misuse.
5. **API surface used by the app** — same OWASP-API-Top-10 coverage we'd give a standalone API engagement.
6. **Platform-specific** — iOS: ATS exemptions, Universal Links abuse. Android: exported components, intent injection, content provider abuse, WebView traps.
7. **Reporting** — every finding with MASVS reference, CVSS v3.1, PoC steps with screenshots, video for runtime exploits where helpful, remediation mapped to your platform.
8. **Retest** — one retest after fixes, included.

We test on physical devices (jailbroken iOS + rooted Android) plus emulators. App build is delivered to us via TestFlight / Play Console / direct IPA+APK — pick whichever you prefer.

## 4. Timeline

| Phase | Duration | Milestone |
|---|---|---|
| Kickoff + build delivery | 2 business days | Test plan agreed |
| Active testing | 7–14 business days (depending on iOS + Android vs single platform) | Daily status; immediate ping on **High**/**Critical** |
| Report drafting | 3 business days | Draft for factual review |
| Final report delivery | — | PDF + remediation tracker |
| Retest window | Within 45 days | Retest results appended |

**Suggested start date:** {{ start_date_suggestion }}

## 5. Investment

| Line | Description | AED |
|---|---|---|
{{#line_items}}
| | {{ description }} | {{ aed }} |
{{/line_items}}
| **Total (excludes VAT)** | | **{{ total_aed }}** |

*Excludes VAT. Excludes travel (mobile pentesting is remote-friendly).*

## 6. Acceptance criteria

- App tested end-to-end against OWASP MASVS Level 1 (or L2 if explicitly in scope).
- Every finding reproducible from PoC.
- **High**/**Critical** finding reported within 4 business hours.
- Final report delivered no later than 3 business days after testing ends.

## 7. What's not in scope

{{#out_of_scope_specifics}}
- {{ . }}
{{/out_of_scope_specifics}}
- The backend API in depth (separate web/API pentest — bundle quote on request).
- App Store review / submission compliance.
- Build pipeline (CI/CD) security.
- Source code review (black-box test unless SAST is added).

## 8. Next steps

1. Sign via the link in the email.
2. Invoice 30% within 5 business days; build access set up within 1 week.
3. Active testing starts: **{{ start_date_suggestion }}**.

{{> _shared-footer }}
