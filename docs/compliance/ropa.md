# Record of Processing Activities (RoPA)

**Controller:** Underwings Cybersecurity Solutions, Abu Dhabi, UAE
**Owner:** DPO (Manoj Prabhakaran, `dpo@underwings.org`)
**Last updated:** 2026-05-27 · **Review:** quarterly
**Legal basis for maintaining this:** UAE PDPL Art. — RoPA is the documented
inventory of every personal-data flow. Everything else (retention, DSAR, transfer
controls) depends on it being accurate.

> This is a living register. When a new tool, integration, or data flow is added
> to the stack, add a row here in the **same change** — that is the discipline.
> Machine-readable copy: [`ropa.csv`](ropa.csv).

## Processing activities

| # | Activity | Personal data | Data subjects | Purpose | Lawful basis | Recipients / sub-processors | Storage (system) | Cross-border? | Retention |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Website enquiry / contact form | Name, work email, phone, company, enquiry text | Prospects | Respond to enquiry, manage opportunity | Legitimate interest / steps prior to contract | Self-hosted CRM | Krayin (self-hosted) | No (if VPS in-region — confirm) | 24 months (inbound) |
| 2 | Outbound prospecting | Name, work email, company, role | Prospects (B2B) | Business development | Legitimate interest (B2B) | Self-hosted CRM | Krayin | No | 12 months (no reply) |
| 3 | Newsletter / threat briefing | Name, email | Subscribers | Marketing (opt-in) | **Consent** (explicit opt-in, withdrawable) | Keila (self-hosted) → Brevo relay | Keila + Brevo | **Yes — Brevo (EU/France)** | Until opt-out |
| 4 | Email delivery (transactional + marketing) | Recipient email, message content | Anyone we email | Send mail reliably | Legitimate interest / consent (marketing) | **Brevo / Sendinblue SAS** | Stalwart → Brevo relay | **Yes — EU (France)** | Per source activity |
| 5 | Appointment scheduling | Name, email, booking details | Prospects/clients | Book discovery/scoping calls | Steps prior to contract | Self-hosted | Cal.com (self-hosted) | No | Tied to lead retention |
| 6 | AI proposal drafting | Lead scope notes (may contain names/company/context) | Prospects | Generate proposals fast | Legitimate interest / contract | **Anthropic PBC (Claude API)** | Sent to API; not retained by us | **Yes — USA**; ephemeral, not stored by provider for training | Not retained beyond call |
| 7 | E-signature of proposals | Signatory name, email, signature, IP | Prospects/clients | Execute engagement contracts | Contract | Self-hosted | Documenso + MinIO (self-hosted) | No | Life of contract + legal |
| 8 | Engagement delivery (pentest/GRC) | Client systems, findings, sometimes staff names | Client staff | Deliver the contracted service | Contract | None (self-hosted, restricted) | Encrypted store | No | Per contract (≈12 mo) then delete |
| 9 | Billing / invoicing | Name, company, billing details | Clients | Get paid, tax records | Legal obligation | Bank / accountant | Finance records | Possibly (bank) | 5 years (UAE law) |
| 10 | Website hosting, DNS, CDN, admin access | Visitor IP, admin emails (magic-link) | Visitors, staff | Serve + protect the site; Zero-Trust admin auth | Legitimate interest | **Cloudflare, Inc.** | Cloudflare edge + tunnel | **Yes — USA / global** | Logs ≈90 days |
| 11 | Server / application logs | IP, request metadata | Visitors | Security, debugging | Legitimate interest | None | VPS (self-hosted) | No | 90 days |
| 12 | Internal CRM analytics warehouse | De-identified deal facts + (until anonymised) person rows | Prospects/clients | Sales reporting (Metabase) | Legitimate interest | None | metrics-db (self-hosted) | No | Mirrors source; re-syncs nightly |

## Cross-border transfers (summary)

Three sub-processors receive personal data outside the UAE. Each requires a
documented safeguard on file (SCCs / DPA):

| Sub-processor | Location | Data | Safeguard to file |
|---|---|---|---|
| Brevo / Sendinblue SAS | France (EU) | Recipient emails, names, message content | DPA + EU SCCs |
| Anthropic PBC | USA | Proposal scope notes (ephemeral) | Commercial terms / DPA; data not used for training |
| Cloudflare, Inc. | USA / global edge | Visitor IPs, admin magic-link emails | DPA + SCCs |

Everything else — Krayin, n8n, Supabase, Stalwart, Keila, Cal.com, Documenso,
MinIO, Metabase, Plane — is **self-hosted on our own VPS**, so there is no
third-party transfer for those stores. *(Action: confirm and record the VPS
physical region; if it is outside the UAE, the primary store itself is a
cross-border transfer and needs its own safeguard line.)*

## DPIA register

No high-risk or large-scale/sensitive processing today, so no DPIA is required.
If we begin processing health data at scale (e.g. an ADHICS client hands us
patient data) or run large-scale profiling, a DPIA must be completed **before**
that processing starts and recorded here.
