-- ===========================================
-- BLOG POSTS SEED DATA
-- Run: docker exec -i dockerized-db-1 psql -U postgres < supabase/seed-blogs.sql
-- ===========================================

-- Increment view count function (if not exists)
CREATE OR REPLACE FUNCTION public.increment_view_count(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.blog_posts SET view_count = view_count + 1 WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- BLOG 1: Why Every Business in the UAE Needs a Penetration Test in 2025
-- ===========================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'Why Every Business in the UAE Needs a Penetration Test in 2025',
  'why-every-business-uae-needs-penetration-test-2025',
  'Cyberattacks targeting UAE businesses surged 70% last year. Here''s why regular penetration testing is no longer optional — and what it actually involves.',
  '## The Threat Landscape Has Changed

The UAE has become one of the most digitally connected economies in the world. With that connectivity comes exposure. In 2024, the UAE Cyber Security Council reported a **70% increase** in cyberattacks targeting businesses across the region — from ransomware campaigns hitting SMBs to advanced persistent threats aimed at government-linked enterprises.

If your organization handles customer data, processes payments, or operates any internet-facing systems, you are a target. The question isn''t *if* someone will try — it''s whether your defences will hold when they do.

## What Is a Penetration Test?

A penetration test (pentest) is a controlled, authorized simulation of a real-world cyberattack. Unlike automated vulnerability scans that simply list potential issues, a pentest involves skilled security professionals actively attempting to exploit weaknesses in your systems — just as a real attacker would.

The goal is simple: **find the gaps before someone else does.**

### What We Test

- **Web Applications** — SQL injection, cross-site scripting (XSS), authentication bypasses, business logic flaws
- **Network Infrastructure** — Open ports, misconfigured firewalls, internal network segmentation
- **APIs** — Broken authentication, excessive data exposure, rate limiting issues
- **Cloud Environments** — IAM misconfigurations, storage bucket exposure, privilege escalation
- **Mobile Applications** — Insecure data storage, certificate pinning, API communication security

## Why Automated Scanners Aren''t Enough

Tools like Nessus, Qualys, and OpenVAS are valuable for identifying known vulnerabilities. But they miss what matters most:

- **Business logic flaws** — A scanner can''t understand that transferring -$500 shouldn''t credit your account
- **Chained exploits** — Individual low-risk findings that combine into critical access
- **Context-dependent risks** — A misconfiguration that''s harmless in isolation but devastating alongside another weakness
- **Social engineering vectors** — No tool can test whether your finance team would fall for a convincing invoice scam

A skilled penetration tester thinks like an attacker — creatively, laterally, and persistently.

## Regulatory Pressure Is Increasing

The UAE''s regulatory environment is tightening:

- **UAE Information Assurance Standards** require regular security assessments for government-linked entities
- **NESA (National Electronic Security Authority)** mandates security testing for critical infrastructure
- **Dubai International Financial Centre (DIFC)** data protection regulations expect demonstrated security measures
- **ISO 27001** — increasingly required by enterprise clients — mandates regular security testing as part of ongoing risk management

Failing to conduct regular pentests doesn''t just leave you exposed to attacks — it leaves you exposed to regulatory penalties and lost contracts.

## What You Get After a Pentest

A professional pentest delivers more than a list of vulnerabilities:

1. **Executive Summary** — Business-impact assessment your leadership team can understand
2. **Technical Report** — Detailed findings with evidence (screenshots, proof-of-concept exploits)
3. **Risk Ratings** — Each finding rated by severity and exploitability
4. **Remediation Guidance** — Specific, actionable steps to fix each issue
5. **Retest Verification** — We verify your fixes actually work

## When Should You Get Tested?

- **Before launching** a new application or platform
- **After major changes** to your infrastructure or codebase
- **Annually** as a minimum baseline
- **Before compliance audits** (ISO 27001, SOC 2, PCI DSS)
- **After a security incident** to ensure no residual access exists

## Getting Started

The first step is a **scoping call** — a 30-minute conversation where we understand your infrastructure, identify what needs testing, and provide a clear timeline and quote.

No sales pressure. No generic proposals. Just an honest assessment of what you need.

[Get a free scoping call →](/#contact)',
  'Penetration Testing',
  ARRAY['VAPT', 'UAE', 'Cybersecurity', 'Penetration Testing', 'Compliance'],
  'published',
  'Underwings Team',
  NOW() - INTERVAL '2 days',
  'UAE businesses face a 70% surge in cyberattacks. Learn why penetration testing is essential, what it covers, and how it differs from automated scanning.'
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- BLOG 2: ISO 27001 vs SOC 2: Which Compliance Framework Does Your Business Need?
-- ===========================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'ISO 27001 vs SOC 2: Which Compliance Framework Does Your Business Need?',
  'iso-27001-vs-soc-2-which-framework-business-needs',
  'Both frameworks prove you take security seriously — but they serve different purposes. Here''s a clear comparison to help you decide which one your business actually needs.',
  '## The Short Answer

- **ISO 27001** if you operate internationally, especially in the Middle East, Europe, or Asia
- **SOC 2** if your primary clients are in North America
- **Both** if you serve a global client base

But the real answer depends on your business context. Let''s break it down.

## What Is ISO 27001?

ISO 27001 is an **international standard** for information security management systems (ISMS). It''s published by the International Organization for Standardization and is recognized worldwide.

### Key Characteristics:
- **Certification-based** — An accredited third-party auditor certifies your organization
- **Risk-driven** — You identify your specific risks and implement controls to address them
- **114 controls** across 14 domains (Annex A) — from access control to cryptography to incident management
- **3-year certification cycle** with annual surveillance audits
- **Globally recognized** — Particularly valued in the Middle East, Europe, and APAC

### Who Needs It?
- Companies handling sensitive client data in regulated industries
- Organizations bidding on government or enterprise contracts in the UAE/India
- SaaS companies expanding into European or Middle Eastern markets
- Any business wanting a structured approach to information security

## What Is SOC 2?

SOC 2 (Service Organization Control 2) is a **reporting framework** developed by the American Institute of CPAs (AICPA). It evaluates an organization''s controls against five Trust Service Criteria.

### Key Characteristics:
- **Report-based** — A CPA firm issues a report, not a certificate
- **Trust Service Criteria** — Security, Availability, Processing Integrity, Confidentiality, Privacy
- **Type I** — Point-in-time assessment of control design
- **Type II** — Assessment of control effectiveness over 3-12 months
- **Primarily recognized in North America**

### Who Needs It?
- SaaS companies selling to US enterprises
- Cloud service providers with US-based clients
- Companies in the US financial services or healthcare supply chain

## Key Differences

| Aspect | ISO 27001 | SOC 2 |
|--------|-----------|-------|
| **Type** | Certification | Audit Report |
| **Scope** | Entire ISMS | Specific services/systems |
| **Recognition** | Global | Primarily North America |
| **Auditor** | Accredited certification body | Licensed CPA firm |
| **Duration** | 3-year cycle + annual surveillance | Annual report (Type II) |
| **Controls** | 114 controls (Annex A) | Based on Trust Service Criteria |
| **Cost** | $15K-$50K+ (implementation + audit) | $20K-$60K+ (audit) |

## Which One First?

For businesses in India and the UAE, we almost always recommend **ISO 27001 first**:

1. **Market recognition** — ISO 27001 is the standard enterprise clients in the region expect
2. **Government contracts** — Many UAE government entities require ISO 27001 from vendors
3. **Foundation building** — ISO 27001''s ISMS framework makes SOC 2 compliance much easier later
4. **Insurance benefits** — Many cyber insurance providers offer better rates for ISO 27001 certified organizations

If your revenue primarily comes from US clients, start with SOC 2 Type II.

## The Implementation Timeline

### ISO 27001 (Typical for SMBs):
- **Month 1-2**: Gap analysis and risk assessment
- **Month 3-4**: Policy development and control implementation
- **Month 5**: Internal audit
- **Month 6**: Stage 1 certification audit (documentation review)
- **Month 7**: Stage 2 certification audit (implementation verification)

### SOC 2 Type II:
- **Month 1-2**: Readiness assessment and gap remediation
- **Month 3-8**: Observation period (minimum 3 months for Type II)
- **Month 9**: Final audit and report issuance

## Common Mistakes to Avoid

1. **Treating it as a checkbox exercise** — Both frameworks are only valuable if the controls actually work
2. **Over-scoping** — Start with your most critical systems, expand later
3. **Ignoring the human element** — Technical controls mean nothing if employees click phishing links
4. **DIY implementation** — The frameworks are complex; expert guidance saves time and money
5. **Waiting until a client demands it** — Getting certified proactively wins you deals before competitors

## How We Help

At Underwings, we''ve guided organizations across India and the UAE through ISO 27001 certification from gap analysis to successful audit. Our approach:

- **Gap Assessment** — Understand where you stand today
- **Roadmap** — Clear, prioritized implementation plan
- **Policy Templates** — Customized to your business, not generic documents
- **Control Implementation** — Hands-on technical and organizational support
- **Audit Preparation** — Mock audits and readiness reviews
- **Ongoing Support** — Annual surveillance audit preparation

[Start with a free gap assessment →](/#contact)',
  'Compliance',
  ARRAY['ISO 27001', 'SOC 2', 'Compliance', 'UAE', 'India', 'Cybersecurity'],
  'published',
  'Underwings Team',
  NOW() - INTERVAL '5 days',
  'ISO 27001 vs SOC 2 — a clear comparison for businesses in India and UAE. Learn which compliance framework you need first and why.'
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- BLOG 3: 5 Phishing Attacks That Bypassed Email Filters in 2025
-- ===========================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  '5 Phishing Attacks That Bypassed Email Filters in 2025',
  '5-phishing-attacks-bypassed-email-filters-2025',
  'Email security tools catch 99% of spam. But the 1% that gets through is the 1% designed to fool your team. Here are 5 real-world attacks we''ve seen this year.',
  '## Your Email Filter Is Not Enough

Modern email security platforms — Microsoft Defender, Proofpoint, Mimecast — are remarkably effective. They block millions of malicious emails every day using AI, sandboxing, and threat intelligence.

But attackers evolve. The phishing emails that reach your inbox in 2025 are not the poorly-spelled "Nigerian prince" messages of a decade ago. They''re sophisticated, targeted, and designed specifically to bypass automated detection.

Here are five real attack patterns we''ve encountered during security assessments this year.

## 1. The Shared Document Trap

**How it works:**
- Employee receives an email from a colleague''s compromised account
- Subject: "Q1 Budget Review — Please Comment"
- Contains a link to a legitimate SharePoint or Google Docs page
- The document contains a second link: "Click here to view the full report"
- That second link leads to a credential harvesting page

**Why filters miss it:**
- The sender is a real, known contact
- The first link points to Microsoft/Google infrastructure (trusted domains)
- No malicious attachments to scan
- Email content looks like normal business communication

**How to defend:**
- Train employees to verify unexpected document shares via a separate channel (Teams, phone)
- Implement conditional access policies that flag logins from unusual locations
- Use browser isolation for links in emails

## 2. The QR Code Invoice

**How it works:**
- Email impersonates a vendor or service provider
- Contains a PDF invoice that looks legitimate
- The PDF includes a QR code: "Scan to view payment details"
- The QR code links to a fake login page optimized for mobile
- Mobile devices often lack the same security controls as desktops

**Why filters miss it:**
- QR codes inside PDFs are not scanned by most email security tools
- The PDF itself is clean — no macros, no embedded scripts
- The malicious URL is encoded in the QR code image, not in text

**How to defend:**
- Establish a policy: never scan QR codes from emails
- Verify invoices through your accounting system, not email links
- Deploy mobile device management (MDM) with web filtering

## 3. The Calendar Invite Attack

**How it works:**
- Attacker sends a calendar invitation that auto-adds to the target''s calendar
- The invite contains a link: "Join meeting" or "View agenda"
- The link leads to a credential phishing page
- Even if the email is deleted, the calendar event persists

**Why filters miss it:**
- Calendar invites (.ics files) are treated as legitimate by email systems
- The invite comes through the calendar protocol, not as a standard email
- Auto-accept settings in many organizations add it without user interaction

**How to defend:**
- Disable auto-accept for external calendar invitations
- Train employees to verify meeting invites from unknown senders
- Review calendar settings in your Microsoft 365 or Google Workspace admin panel

## 4. The Thread Hijack

**How it works:**
- Attacker compromises one email account in an existing conversation
- They reply to a real, ongoing email thread with a malicious attachment or link
- The email appears in the middle of a trusted conversation
- Context is perfect — the attacker references actual project details

**Why filters miss it:**
- The email is a reply in a legitimate thread (passes DKIM/SPF/DMARC)
- Content matches the conversation context
- Trust is already established between the participants
- AI-based detection sees it as normal continuation

**How to defend:**
- Implement anomaly detection that flags unusual attachments in ongoing threads
- Enable multi-factor authentication on all email accounts (prevents the initial compromise)
- Security awareness training focused on verifying unexpected attachments, even from known contacts

## 5. The Delayed Payload

**How it works:**
- Email contains a link to a clean, legitimate-looking page
- The page is genuinely harmless at the time of delivery (passes sandbox analysis)
- Hours later — after the email has been delivered and marked safe — the page content changes
- The page now serves malware or a credential harvesting form

**Why filters miss it:**
- URL scanning at delivery time shows a clean page
- Retrospective URL rescanning varies by vendor — some don''t do it at all
- The time delay defeats sandbox analysis

**How to defend:**
- Use email security solutions with time-of-click URL protection (rewrites links)
- Enable retrospective URL rescanning if your platform supports it
- Deploy endpoint detection and response (EDR) as a safety net

## The Human Layer Is Your Last Defence

Technology catches 99% of threats. But the 1% that gets through is specifically designed to exploit human trust, urgency, and habit.

The most effective defence we''ve seen is a combination of:

1. **Regular phishing simulations** — Not to punish, but to build pattern recognition
2. **Just-in-time training** — Immediate, specific feedback when someone clicks a simulated phish
3. **Easy reporting** — A one-click "Report Phishing" button that employees actually use
4. **Positive reinforcement** — Recognize and reward employees who report suspicious emails

## Build Your Human Firewall

Our security awareness training program includes:

- Customized phishing simulations based on real attacks targeting your industry
- Monthly campaigns with increasing sophistication
- Executive-specific scenarios (CEO fraud, wire transfer requests)
- Measurable metrics: click rates, report rates, improvement over time
- Compliance-ready documentation for ISO 27001 and regulatory requirements

[Start a pilot program →](/#contact)',
  'Cybersecurity',
  ARRAY['Phishing', 'Email Security', 'Social Engineering', 'Security Awareness', 'Training'],
  'published',
  'Underwings Team',
  NOW() - INTERVAL '8 days',
  'Five real-world phishing attacks that bypassed email filters in 2025. Learn the techniques attackers use and how to defend your organization.'
)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- BLOG 4: How to Choose the Right Cybersecurity Software for Your Business
-- ===========================================
INSERT INTO public.blog_posts (title, slug, excerpt, content, category, tags, status, author_name, published_at, meta_description) VALUES
(
  'How to Choose the Right Cybersecurity Software for Your Business',
  'how-to-choose-right-cybersecurity-software-business',
  'Endpoint protection, SIEM, email security, vulnerability management — the market is overwhelming. Here''s a practical framework for choosing what you actually need.',
  '## The Problem with Security Software Shopping

There are over 3,500 cybersecurity vendors in the market today. Each one claims to be essential. Each one has impressive demo environments. And each one will happily sell you a multi-year contract.

The result? Organizations end up with overlapping tools, shelfware they never configured properly, and a false sense of security.

Here''s a practical framework for cutting through the noise.

## Start with Your Risks, Not the Market

Before evaluating any product, answer these questions:

1. **What are your crown jewels?** — Customer data, intellectual property, financial systems?
2. **Where do they live?** — On-premises servers, cloud (AWS/Azure/GCP), SaaS applications?
3. **Who has access?** — How many employees, contractors, third parties?
4. **What''s your regulatory environment?** — ISO 27001, NESA, DIFC, PCI DSS?
5. **What''s your current security posture?** — Have you had a recent assessment?

Your answers determine your priorities. A 50-person SaaS company has very different needs than a 500-person manufacturing firm.

## The Essential Security Stack

For most businesses in the SMB and mid-market range, here''s what you actually need — in priority order:

### 1. Endpoint Detection & Response (EDR)

**What it does:** Monitors all endpoints (laptops, servers, mobile devices) for malicious activity and provides automated response.

**Why it''s #1:** Endpoints are where attacks happen. Ransomware, malware, credential theft — it all starts on an endpoint.

**What to look for:**
- Real-time detection with behavioural analysis (not just signatures)
- Automated response actions (isolate device, kill process)
- Cloud-based management console
- Integration with your existing tools
- Managed detection option (MDR) if you don''t have a 24/7 SOC

**Leading solutions:** CrowdStrike Falcon, SentinelOne, Microsoft Defender for Endpoint

### 2. Email Security

**What it does:** Filters inbound and outbound email for phishing, malware, spam, and business email compromise (BEC).

**Why it''s #2:** Email is the #1 attack vector. Over 90% of successful breaches start with a phishing email.

**What to look for:**
- AI-based detection (not just blocklists)
- URL rewriting with time-of-click analysis
- Attachment sandboxing
- BEC protection (impersonation detection)
- Integration with Microsoft 365 or Google Workspace

**Leading solutions:** Proofpoint, Mimecast, Microsoft Defender for Office 365, Abnormal Security

### 3. Vulnerability Management

**What it does:** Continuously scans your infrastructure for known vulnerabilities and misconfigurations.

**Why it''s #3:** You can''t fix what you can''t see. Regular scanning identifies weaknesses before attackers do.

**What to look for:**
- Authenticated scanning (deeper, more accurate results)
- Risk-based prioritization (not just CVSS scores)
- Cloud and container scanning
- Integration with your ticketing system for remediation tracking
- Compliance reporting

**Leading solutions:** Tenable, Rapid7 InsightVM, Qualys VMDR

### 4. SIEM / Log Management

**What it does:** Collects, correlates, and analyzes security logs from across your environment to detect threats.

**Why it''s #4:** Without centralized logging, you''re flying blind. SIEM gives you visibility and supports incident investigation.

**What to look for:**
- Cloud-native architecture (avoid hardware-heavy on-prem solutions for SMBs)
- Pre-built detection rules and threat intelligence integration
- Reasonable data ingestion pricing
- Automated alerting and investigation workflows
- Compliance dashboards

**Leading solutions:** Microsoft Sentinel, Splunk, Elastic Security, Securin

### 5. Network Security

**What it does:** Protects your network perimeter and internal segments with firewalls, IDS/IPS, and network monitoring.

**What to look for:**
- Next-generation firewall (NGFW) with application awareness
- SSL/TLS inspection capability
- VPN for remote access (or zero-trust network access)
- Network segmentation support
- Cloud firewall options if you''re primarily cloud-based

**Leading solutions:** Palo Alto Networks, Fortinet, Check Point

## Common Mistakes

### 1. Buying Best-of-Breed Everything
Integration complexity increases exponentially with each vendor. A well-configured platform approach often beats a collection of poorly integrated point solutions.

### 2. Ignoring Operational Costs
The license fee is 30-40% of the total cost. Implementation, configuration, tuning, training, and ongoing management are the real expenses.

### 3. Overbuying for Your Size
A 100-person company doesn''t need an enterprise SIEM with 50TB/day ingestion. Right-size your solutions.

### 4. Skipping the POC
Never buy based on a demo alone. Run a proof-of-concept in your actual environment for at least 2 weeks.

### 5. Forgetting About People
The best tools are useless without trained staff to operate them. Budget for training or consider managed services.

## Our Approach

At Underwings, we partner with leading security vendors to provide the right solution — not the most expensive one. Our process:

1. **Assessment** — Understand your current environment and risks
2. **Recommendation** — Vendor-neutral advice based on your specific needs
3. **Procurement** — Competitive pricing through our partner network
4. **Implementation** — Proper deployment, configuration, and tuning
5. **Training** — Your team learns to operate the tools effectively
6. **Ongoing Support** — We''re here when you need help

We work with Tenable, Rapid7, Securin, and other leading vendors. But we''ll always recommend what fits your business — even if that means a simpler, less expensive solution.

[Get a tailored recommendation →](/#contact)',
  'Cybersecurity',
  ARRAY['Security Software', 'EDR', 'SIEM', 'Email Security', 'Vulnerability Management', 'Buying Guide'],
  'published',
  'Underwings Team',
  NOW() - INTERVAL '12 days',
  'A practical guide to choosing cybersecurity software for your business. EDR, email security, SIEM, vulnerability management — what you need and what you don''t.'
)
ON CONFLICT (slug) DO NOTHING;
