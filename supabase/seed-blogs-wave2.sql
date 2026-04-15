-- ============================================================
-- BLOG SEED — Wave 2 (Apr 2026)
-- 5 additional posts filling SEO gaps per marketing-sales plan:
-- NESA, Azure misconfigs, Phishing vs Awareness, Pen Test vs VA,
-- Risk Register. Run against the underwings Supabase database.
-- ============================================================

-- ============================================================
-- BLOG 5: NESA / UAE IA V2 in Plain English
-- ============================================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'NESA / UAE IA V2 in Plain English — What Every UAE Business Needs to Know',
  'nesa-uae-ia-v2-in-plain-english',
  'NESA and UAE IA V2 compliance explained without the jargon — what it covers, who it applies to, how it differs from ISO 27001, and what a realistic gap assessment costs.',
  '## What NESA and UAE IA V2 Actually Mean

If you''ve been through a UAE government tender in the last few years, you''ve probably seen the letters **NESA** or **UAE IA**. You may have been told you need to be "NESA compliant." You may have been told it''s different from ISO 27001. You may have been told it''s the same.

Here''s the plain-English version.

- **NESA** is shorthand for the **National Electronic Security Authority** — the UAE federal body that originally issued the national cybersecurity framework. NESA has since been reorganised under the **Signals Intelligence Agency (SIA)**, but the framework name stuck in industry usage.
- **UAE IA (Information Assurance) Standard V2** is the current version of the national cybersecurity framework issued by SIA. It''s the updated, authoritative document. When someone says "NESA V2" they almost certainly mean UAE IA V2.

Think of it this way: **NESA is the label; UAE IA V2 is the document.**

## Who Actually Needs to Comply

UAE IA V2 directly applies to:

- **Critical Information Infrastructure (CII) entities** — energy, utilities, telecom, transport, finance, health
- **Federal government entities and their direct suppliers**
- **Semi-government entities** in Abu Dhabi, Dubai, and other emirates

But the framework has also become a **default procurement question** across the UAE private sector. Enterprise procurement teams, banks, and government-adjacent clients now routinely ask: *"Are you NESA-aligned?"* If you sell to any of these, you probably need at least a defensible posture statement.

## What the Framework Covers

UAE IA V2 organises controls into domains covering:

1. **Governance** — security policies, risk management, roles and responsibilities
2. **Asset management** — hardware, software, data classification
3. **Information lifecycle** — handling, retention, disposal
4. **Physical and environmental security**
5. **Operations security** — change, capacity, malware, backups, logging
6. **Communications and network security**
7. **Identity and access management**
8. **System acquisition, development, and maintenance**
9. **Supplier and third-party security**
10. **Incident management and business continuity**
11. **Compliance with legal and regulatory requirements**

If that list sounds familiar, it''s because the framework draws heavily from international standards like ISO 27001 and NIST 800-53. The overlap with ISO 27001 is roughly 50 – 60% at the control level — but UAE IA V2 adds UAE-specific controls around cross-border data, national security, and supply-chain assurance that international standards don''t explicitly mandate.

## NESA vs. ISO 27001 — The Honest Difference

| | NESA / UAE IA V2 | ISO 27001 |
|---|---|---|
| **Type** | UAE national standard | International voluntary certification |
| **Who requires it** | UAE CII, government, many tenders | Global enterprise procurement |
| **Certification body** | Designated UAE auditors | Accredited certification bodies |
| **Control count** | ~180 controls across domains | 93 Annex A controls (2022) |
| **Best for** | UAE govt-adjacent work | International market access |

You often need **both** — and the good news is most control work satisfies both frameworks. We frequently scope combined assessments that save 15 – 20% versus running each sequentially.

## What a Gap Assessment Actually Costs

Pricing varies with scope, but for a typical UAE mid-market organisation:

- **UAE IA V2 Gap Assessment alone:** AED 20,000 – 50,000
- **ISO 27001 Gap + UAE IA V2 Gap combined:** AED 35,000 – 80,000 (vs. ~60,000 – 100,000 sequentially)

The engagement typically takes 3 – 4 weeks: 1 week scoping, 2 weeks fieldwork and assessment, 1 week reporting.

## What You Walk Away With

A proper gap assessment delivers:

- A **controls-by-controls assessment report** with maturity ratings (0 – 4) for every applicable control
- **Cross-framework mapping** showing where your existing ISO 27001 or NIST work already satisfies NESA (avoiding duplicate effort)
- A **prioritised remediation roadmap** — 90-day / 6-month / 12-month plan with effort estimates
- An **executive summary** with a maturity heat map for your board
- A **procurement-ready posture statement** you can use in response to tender and client questions

## The One Mistake Everyone Makes

The single biggest mistake we see with UAE IA V2 is treating it as a paper exercise — producing documentation that looks good but isn''t operationally meaningful. Auditors and regulators are increasingly asking for **evidence of implementation**, not just policies. A gap assessment should surface gaps in actual practice, not just gaps in documents.

If you''re heading into a NESA assessment or answering a procurement question about UAE IA V2 posture, start with an honest gap view.

---

**Ready to get a real read on your NESA posture?** [Explore our NESA / UAE IA V2 Gap Assessment service →](/services/grc/nesa-uae-ia) or [book a 30-minute scoping call](/#contact?service=nesa).',
  'Compliance',
  ARRAY['NESA', 'UAE IA V2', 'Compliance', 'Government', 'Gap Assessment'],
  'published',
  'Manoj Prabhakaran',
  '2026-04-15 13:00:00+04'::timestamptz,
  'NESA and UAE IA V2 in plain English. What the national cybersecurity framework covers, who it applies to, how it differs from ISO 27001, and gap assessment costs.'
);

-- ============================================================
-- BLOG 6: 7 Azure Misconfigurations We See in Every UAE Assessment
-- ============================================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'The 7 Azure Misconfigurations We See in Every UAE Assessment',
  '7-azure-misconfigurations-uae-assessments',
  'Every UAE Azure tenant we''ve reviewed shares the same 7 misconfigurations. Here''s what they are, why they happen, and how to fix them in an afternoon.',
  '## Every UAE Azure Tenant Has These

The UAE has one of the highest Microsoft Azure adoption rates in the region — government mandates, TRA guidance, and enterprise preference have pushed Azure to the default position for mid-market cloud infrastructure.

The consistent story: **tenants are deployed fast, configured defaults are accepted, and security is revisited only after an incident or an audit.**

These are the seven misconfigurations we find in almost every Azure assessment. Most take under an hour to fix. Together they close the vast majority of real-world risk.

## 1. Over-Permissive Conditional Access

Nearly every tenant we''ve reviewed has Conditional Access policies that either:

- Don''t require MFA for admin accounts (break-glass account excepted)
- Exclude "trusted" named locations that are actually just office IPs from five years ago
- Don''t enforce device compliance for Microsoft 365 app access

**Fix:** Baseline policies — require MFA for all users, block legacy authentication, require compliant or hybrid-joined device for sensitive apps. Microsoft''s own "Security Defaults" cover 80% of this out of the box if Conditional Access isn''t actively managed.

## 2. MFA Exceptions That Never Expire

Someone was locked out once. They got a temporary MFA exception. The exception stayed. Fast-forward two years and critical service accounts, old executive accounts, and offboarded-staff accounts all still bypass MFA.

**Fix:** Audit all MFA exclusion groups quarterly. Any exception should have an expiry date and a documented reason. Service accounts should use workload identities or managed identities, not MFA exceptions.

## 3. Storage Accounts with Public Blob Access Enabled

Default Azure storage-account configuration historically allowed public blob access. Even after Microsoft changed the default, tenants created before the change still have it enabled. Backups, exports, invoice files, app config — things that were "never going to be accessed externally" regularly show up in public-container scans.

**Fix:** Set the tenant-level default to **disable public blob access**. Audit existing storage accounts and enforce via Azure Policy. CIS Azure Benchmark control 3.3 covers this.

## 4. Entra ID Role Assignments Without Privileged Identity Management (PIM)

Global Administrator, Privileged Role Administrator, Security Administrator — assigned permanently to people who only need them occasionally. A phishing campaign that captures any of these credentials is an instant tenant takeover.

**Fix:** Enable PIM (requires Entra ID P2). Convert all privileged roles to eligible assignments with just-in-time activation, MFA at activation, and time-limited duration. Audit quarterly.

## 5. Microsoft Defender for Cloud Left at "Free" Tier

Defender for Cloud is enabled by default at the free tier, which only covers Secure Score. The enhanced protection (threat detection, just-in-time VM access, adaptive application controls, file integrity monitoring) is a paid tier — and it''s disabled in roughly 80% of tenants we audit.

**Fix:** At minimum, enable Defender for Servers, Defender for App Service, and Defender for Storage on production subscriptions. Cost is roughly $15 – 30 per resource per month. Compared to the cost of a single incident, it''s trivial.

## 6. Network Security Groups That Allow All Azure Services

The Azure Service Tag `AzureCloud` is a common default rule that allows traffic from any Azure IP. This means a compromised Azure tenant elsewhere in the world can potentially reach your resources.

**Fix:** Replace broad service tags with specific tags (`AzureCloud.<region>`, or specific services like `AzureFrontDoor.Backend`). Where possible, use Private Endpoints instead of public-facing NSG rules.

## 7. No Log Analytics Workspace — Or One Nobody Monitors

Azure generates enormous volumes of useful signal: sign-in logs, audit logs, resource logs, Defender alerts. Most tenants either don''t have a Log Analytics workspace at all, or have one that nobody has logged into in six months.

**Fix:** Enable diagnostic settings on all critical resource types. Route to a Log Analytics workspace with at least 90-day retention. Set up basic alerts: failed admin sign-ins, impossible-travel, storage account key rotation, role assignments. Even better: pipe to Microsoft Sentinel or your SIEM.

## The Pattern Behind All Seven

Every one of these misconfigurations has the same root cause: **defaults were accepted at deployment, and security review was never scheduled**. Fix that systemic issue and everything else becomes tractable.

## What a Formal Review Looks Like

If you''d rather someone find all of these (and the 20 – 30 less-common issues we typically surface) for you, that''s what our [Azure Cloud Security Assessment](/services/cloud-security/azure-cloud-security-assessment) does — CIS Azure Benchmark, Entra ID, RBAC, Defender, NSG, and Key Vault — end-to-end in 5 – 10 working days, from AED 15,000.

Most assessments produce 10 – 30 high-severity findings that take hours, not months, to fix. It''s the highest-ROI cloud-security work available.

---

**Want us to audit your Azure tenant?** [Book a 30-minute scoping call →](/#contact?service=azure-security-assessment)',
  'Cybersecurity',
  ARRAY['Azure', 'Cloud Security', 'Microsoft', 'CIS Benchmark', 'UAE'],
  'published',
  'Manoj Prabhakaran',
  '2026-04-15 13:15:00+04'::timestamptz,
  '7 Azure misconfigurations we find in every UAE assessment — Conditional Access, MFA, storage, PIM, Defender, NSGs, logging. Fixes take hours.'
);

-- ============================================================
-- BLOG 7: Phishing Simulation vs Awareness Training — Which First?
-- ============================================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'Phishing Simulation vs Security Awareness Training — Which Should UAE SMEs Start With?',
  'phishing-simulation-vs-awareness-training-uae',
  'Most UAE SMEs ask us this: do we run a phishing simulation first, or do awareness training first? Here''s the honest answer based on 90-day behaviour data.',
  '## The Question Every UAE SME Asks

A UAE business owner, HR lead, or IT manager gets asked by the board — or the auditor — to "do something about phishing." They get two options from us: **Phishing Simulation** or **Security Awareness Training**. And they ask a sensible question:

> *"Which one do we start with?"*

The answer most consultants give is "both." That''s not wrong, but it''s not useful either. Here''s a more practical answer based on what actually changes employee behaviour.

## The Short Answer

**Start with a phishing simulation — but only if you''re prepared to run it again after training.**

A single phishing sim without training is a one-time data point. A single training session without measurement is a compliance checkbox. The value is in the **before / after comparison** — baseline click rate, intervention (training), follow-up click rate, and then sustained measurement over 90 days.

## Why Baseline First

Running a phishing sim *before* training gives you:

1. **An honest baseline.** UAE SMEs we work with typically start with click rates between 18% and 35%. That''s what you''re working against.
2. **Concrete examples** for the training. When 14% of your finance team clicked a fake invoice lure, the training writes itself.
3. **Board-consumable urgency.** "33% click rate" gets attention. "We should do training" does not.
4. **Audit evidence.** ISO 27001, NESA, and PDPL frameworks all benefit from documented baseline data.

If you train first, you''re guessing at the problem. If you sim first, you know it.

## The 30-60-90-Day Model

Here''s the pattern that works for UAE SMEs (10 – 200 employees):

| Phase | Activity | Purpose |
|---|---|---|
| Week 0 | Baseline phishing sim (1 – 3 scenarios) | Measure current click rate, by role |
| Week 2 – 3 | [Security Awareness Training](/services/training-awareness/security-awareness-training) (workshops, live demos) | Train with specific examples from baseline |
| Day 30 | Follow-up phishing sim | Measure immediate behaviour change |
| Day 60 | Second follow-up sim, different scenarios | Check decay |
| Day 90 | Third sim + summary report | Long-term retention measurement |

The typical result: click rates drop from 25 – 35% to 5 – 12% across this cycle. Finance teams show the biggest improvement; sales teams show the most decay.

## What Each Service Actually Costs

For a typical UAE SME (30 – 100 employees):

- **Phishing Simulation** (single campaign, 3 – 5 scenarios): AED 8,000 – 20,000
- **Security Awareness Training** (workshops, 1 – 2 sessions): AED 8,000 – 25,000
- **Combined program** (baseline sim + training + 3 follow-up sims over 90 days): AED 30,000 – 55,000

The combined program is what most clients actually buy. Running just one half of it produces data; running both produces behaviour change.

## When to Skip the Sim and Go Straight to Training

There are scenarios where starting with training makes sense:

1. **You''ve just had an incident.** Click rate data is moot — everyone is sensitized. Train immediately while memory is fresh.
2. **Your compliance deadline is next month.** Training is fast to schedule; phishing sims take 2 – 3 weeks.
3. **You''re under 10 employees.** Small sample sizes make click-rate metrics statistically meaningless. Direct training is more effective.

Otherwise: sim first.

## Why This Combination Beats E-Learning Platforms

Most UAE SMEs have tried some form of e-learning — KnowBe4, Proofpoint, generic LMS phishing modules. The result is consistent: click rates drop briefly then return to baseline within 60 days.

The difference with our model is the **live demonstration layer**. Our workshops are delivered by the same people who run pen tests — when someone stands in front of your team and spoofs a Wi-Fi network live, or walks through a phishing kit they''ve used against real targets, the memory sticks in a way slide-click modules don''t.

## The Measurement Question

Without baseline data, you can''t prove training worked. And without training, your baseline just tells you what you already knew: employees click. The value is in the delta — and that needs both halves.

---

**Ready to get a baseline click rate for your organisation?** Book a 30-minute scoping call. We can typically run a baseline sim within 2 weeks and have training scheduled by week 3.

- [Phishing Simulation service details →](/services/offensive-security/phishing-simulation)
- [Security Awareness Training details →](/services/training-awareness/security-awareness-training)
- [Book a scoping call →](/#contact?service=phishing-simulation)',
  'Training',
  ARRAY['Phishing', 'Security Awareness', 'Training', 'Human Risk', 'UAE SME'],
  'published',
  'Nelson Durairaj',
  '2026-04-15 13:30:00+04'::timestamptz,
  'Phishing simulation or security awareness training — which should UAE SMEs start with? Honest answer based on 90-day behaviour-change data.'
);

-- ============================================================
-- BLOG 8: Penetration Testing vs Vulnerability Assessment — Differences
-- ============================================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'Penetration Testing vs Vulnerability Assessment — What''s the Difference and Which Do You Need?',
  'penetration-testing-vs-vulnerability-assessment-uae',
  'Pen test vs vulnerability assessment — what you''re paying for, what each produces, and which one actually satisfies your ISO 27001 or enterprise client demand.',
  '## Two Services, Often Confused

A UAE client asks for a "security test." Some want a penetration test. Some want a vulnerability assessment. Most can''t tell the difference — and neither can their vendors, half the time.

The difference matters. One produces a scan report; the other produces evidence of real-world exploitability. One costs AED 5,000; the other AED 20,000 – 60,000. One satisfies a PCI DSS quarterly scan; the other satisfies an ISO 27001 or enterprise procurement demand.

Here''s the plain-English breakdown.

## What a Vulnerability Assessment Actually Is

A **Vulnerability Assessment (VA)** is a **breadth-first, scan-based** inventory of known vulnerabilities. Tools like Nessus, OpenVAS, Nuclei, and Qualys run automated checks against your targets and produce a list of findings with CVSS scores.

- **Goal:** Catalogue known vulnerabilities.
- **Method:** Automated scanning, with manual validation of criticals.
- **Depth:** Shallow — checks for known patterns, doesn''t attempt exploitation.
- **Output:** Findings report with CVSS scores and remediation guidance.
- **Typical cost (UAE):** AED 5,000 – 15,000 per engagement.
- **Typical duration:** 2 – 5 working days end-to-end.

VA is the right choice when:

- You''re an SME doing your first formal security assessment
- You need PCI DSS quarterly external scan evidence
- You need a cheap, recurring baseline of known-issue exposure
- Your budget can''t stretch to a full pen test

## What a Penetration Test Actually Is

A **Penetration Test** is a **depth-first, manual attack simulation** by a credentialed offensive-security practitioner. The tester starts where scanners stop: chaining findings together, escalating privileges, moving laterally, and demonstrating the actual business impact of weaknesses.

- **Goal:** Find real-world paths an attacker could exploit.
- **Method:** Manual, exploit-driven, context-aware testing.
- **Depth:** Deep — scanners are tools; the testing is human.
- **Output:** Findings report with reproduction steps, business impact, and remediation walkthrough.
- **Typical cost (UAE):** AED 15,000 – 60,000 depending on scope.
- **Typical duration:** 2 – 3 weeks including scoping, testing, reporting, walkthrough.

Pen testing is the right choice when:

- An enterprise client or bank has asked for a pen-test report
- You''re preparing for ISO 27001, SOC 2, PCI DSS, or NESA audit
- You''ve recently deployed significant infrastructure or application changes
- The board or CISO has asked what an attacker would actually find

## The Critical Difference

A scanner finds: *"Apache 2.4.41 is installed; CVE-2021-42013 exists."*

A pen tester finds: *"Apache 2.4.41 is installed; the CVE is exploitable in your configuration; I used it to gain shell access; I pivoted to your internal network; I captured credentials from the domain controller; here''s the forest root I achieved in 4 hours."*

Both findings might score the same CVSS. Only one is useful to an auditor asking for evidence of exploitability.

## Which Satisfies Your Compliance Requirement?

- **PCI DSS quarterly external scan:** VA only. ASV-authorised scanner sufficient.
- **PCI DSS annual penetration test:** Pen test required. Specifically called out in the standard.
- **ISO 27001 Annex A.8.8:** Pen test preferred; VA alone usually insufficient for certification auditor.
- **NESA / UAE IA V2 technical controls:** Pen test preferred; VA as evidence of continuous scanning.
- **PDPL:** Neither explicitly required, but pen test highly recommended for data-handling systems.
- **SOC 2:** Pen test effectively mandatory for the trust services criteria.
- **Enterprise procurement pen-test demand:** Pen test, always. VA alone doesn''t pass procurement review.

## The Bundling Question

Many UAE mid-market organisations end up needing both over time:

- **Annual pen test** (mandatory for compliance, deep assurance)
- **Quarterly VA** (continuous monitoring, cheap coverage, satisfies ongoing-scan requirements)

Most of our pen-test clients add a recurring VA retainer after the first engagement — AED 5,000 – 12,000 per quarter for standing coverage.

## The "Which Do I Actually Need" Decision Tree

- **Starting from zero, no specific compliance driver?** VA first. Get the baseline, fix the obvious. Upgrade to pen test when the scope or client demand justifies it.
- **Compliance driver (ISO 27001, SOC 2, PCI DSS, enterprise client contract)?** Pen test. Non-negotiable.
- **Recurring cheap coverage needed?** VA on retainer, plus annual pen test.
- **Had an incident?** Pen test. You need to know what the attacker could have done beyond what they did.

## What We Recommend Day-1

For UAE SMEs (10 – 50 employees) with no formal security posture, we typically recommend:

1. **Vulnerability Assessment** to set the baseline (1 week, AED 5,000 – 10,000)
2. Fix the top 10 critical/high findings (2 – 4 weeks, your IT team)
3. **Web Application Penetration Testing** if customer-facing web surface (3 weeks, AED 15,000 – 25,000)
4. Or **Network Penetration Testing** if the exposure is more infrastructure than app (3 weeks, AED 20,000 – 40,000)

Total first-year offensive-security spend: AED 25,000 – 50,000 for a serious, defensible program.

---

**Not sure which one you need?** 30-minute scoping call, we''ll tell you honestly.

- [Vulnerability Assessment (VA only) details →](/services/offensive-security/vulnerability-assessment)
- [Network Penetration Testing details →](/services/offensive-security/network-penetration-testing)
- [Web Application Penetration Testing details →](/services/offensive-security/web-application-penetration-testing)
- [Book a scoping call →](/#contact?service=vulnerability-assessment)',
  'Penetration Testing',
  ARRAY['Penetration Testing', 'Vulnerability Assessment', 'VAPT', 'Compliance', 'UAE'],
  'published',
  'Nelson Durairaj',
  '2026-04-15 13:45:00+04'::timestamptz,
  'Pen test vs vulnerability assessment — what each produces, what it costs in UAE, and which one actually satisfies your compliance requirement.'
);

-- ============================================================
-- BLOG 9: Building an ISO 27005-Aligned Risk Register
-- ============================================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'Building an ISO 27005-Aligned Risk Register — A UAE SME Playbook',
  'iso-27005-risk-register-uae-sme-playbook',
  'How to build a defensible cybersecurity risk register that satisfies ISO 27001, NESA, and PDPL — with a scoring rubric, template, and common UAE-sector risks.',
  '## The Most Underrated Deliverable in Cybersecurity

Every UAE business going through ISO 27001 certification, NESA assessment, or a serious compliance program will be asked the same question by an auditor:

> *"Show me your risk register."*

Most organisations produce something that looks like a risk register: a spreadsheet with 15 – 40 rows, colour-coded cells, vague descriptions. Competent auditors can tell within 60 seconds whether it''s a real risk register or theatre. Real ones pass audit. Theatre doesn''t.

Here''s how to build a real one — the ISO 27005-aligned method we use with UAE clients.

## What a Risk Register Actually Is

A risk register is a **living document** that identifies, assesses, treats, and tracks cybersecurity risks to your organisation. ISO 27005 (the risk management standard underpinning ISO 27001 Clause 6) defines the process; the register is the output.

A proper risk register has six core fields per risk:

1. **Risk description** — what could happen, affecting what asset
2. **Threat × vulnerability** — how the risk could materialise
3. **Likelihood score** — on a defined rubric
4. **Impact score** — on a defined rubric
5. **Treatment decision** — avoid, transfer, mitigate, accept
6. **Owner + target date** — who, by when

Plus the metadata auditors expect: date identified, last reviewed, residual risk after treatment, and evidence references.

## The Scoring Rubric You Actually Need

Vague rubrics ("Low/Medium/High") don''t survive audit scrutiny. Here''s a defensible 5-point scale that works for UAE mid-market organisations:

### Likelihood (5 = most likely)

| Score | Label | Description |
|---|---|---|
| 1 | Rare | Never happened; no known precedent in sector |
| 2 | Unlikely | Known to happen in sector, not in similar orgs |
| 3 | Possible | Known to happen in similar orgs annually |
| 4 | Likely | Happens in similar orgs quarterly |
| 5 | Almost certain | Happens in similar orgs monthly or has happened to us |

### Impact (5 = most severe)

| Score | Label | Description |
|---|---|---|
| 1 | Negligible | < AED 10k or < 4 hours downtime |
| 2 | Minor | AED 10k – 100k or 1 day downtime |
| 3 | Moderate | AED 100k – 500k or 1 week downtime |
| 4 | Major | AED 500k – 5M or 1 month downtime |
| 5 | Severe | > AED 5M or > 1 month downtime or regulatory penalty |

Multiply for the risk score (1 – 25). Define acceptance thresholds explicitly — e.g., "risks scoring 1 – 4 require acceptance with documented rationale; 5 – 14 require treatment; 15+ require board escalation."

## Treatment Options

Four standard options under ISO 27005:

1. **Avoid** — remove the source of the risk (retire a system, don''t enter a market)
2. **Transfer** — shift to a third party (insurance, outsourcing)
3. **Mitigate** — apply controls to reduce likelihood or impact
4. **Accept** — explicit, documented acceptance with rationale and sign-off

Every risk must have a treatment decision. **"We''ll think about it"** is not a treatment.

## Common UAE Risks You''ll Likely Need

Sector-specific risks vary, but these show up in almost every UAE mid-market risk register:

- Business email compromise (BEC) leading to wire fraud
- Ransomware via phishing email or malicious attachment
- Cloud misconfiguration exposing customer data
- Lost or stolen employee device containing sensitive data
- Third-party / supplier compromise (supply-chain attack)
- Unauthorized access via stolen credentials (credential stuffing)
- Insider data theft on offboarding
- Payment card data exposure (for fintech / e-commerce)
- Regulatory penalty for PDPL non-compliance (for data-handling businesses)
- Loss of certification (ISO 27001) due to audit findings

Each needs a specific threat × vulnerability combination, not just "ransomware might happen."

## The Review Cadence That Survives Audit

A register reviewed once a year at audit time looks exactly like a register reviewed once a year at audit time. Auditors notice.

Defensible cadence:

- **Quarterly:** review of high and critical risks (score 15+). Owner updates progress; any new treatments documented.
- **Annually:** full register review. Add new risks, retire resolved ones, re-score changed ones.
- **On change:** any material business event (new system, new market, incident, organisational change) triggers ad-hoc review.

The register date of last review should never be more than 90 days old for high-scoring risks.

## The Biggest Mistake Mid-Market Companies Make

Copying a generic template from a consultant. We''ve seen risk registers that list "Data Breach" as a single risk with a score. Auditors hate this, and they''re right to — a "Data Breach" is an outcome, not a risk. The risk is specific: **credential phishing → Entra ID compromise → SharePoint document exfiltration** — with a specific likelihood score based on your current controls and a specific impact score based on the value of what''s in SharePoint.

Build it from your actual assets, not from a template.

## What It Costs to Do This Right

A proper risk register takes time — typically 2 – 3 weeks of focused work for a UAE mid-market organisation. You can build it in-house if you have a credentialed risk lead; most don''t.

External build cost: AED 20,000 – 45,000 for a [standalone Risk Assessment & Register Build](/services/grc/risk-assessment-register). Included as a sub-deliverable of ISO 27001 Implementation.

After it''s built, maintenance is on you. The handover workshop covers how to keep it alive; ongoing retainer support is a 2027 offering on our roadmap.

---

**Need a risk register your next audit won''t laugh at?**

- [Risk Assessment & Register service details →](/services/grc/risk-assessment-register)
- [ISO 27001 Implementation (includes risk register) →](/services/grc/iso-27001-implementation)
- [Book a scoping call →](/#contact?service=risk-assessment)',
  'Compliance',
  ARRAY['ISO 27005', 'Risk Management', 'Risk Register', 'ISO 27001', 'UAE'],
  'published',
  'Manoj Prabhakaran',
  '2026-04-15 14:00:00+04'::timestamptz,
  'Build a defensible cybersecurity risk register that passes ISO 27001 / NESA / PDPL audits. Scoring rubric, treatment options, UAE-sector risks, review cadence.'
);
