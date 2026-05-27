# Data Retention Policy

**Owner:** DPO (Manoj Prabhakaran) · **Last updated:** 2026-05-27 · **Review:** annual
**Legal basis:** UAE PDPL (Federal Decree-Law No. 45 of 2021) — personal data
must be kept no longer than necessary for the purpose it was collected.

We keep personal data only as long as it serves a defined purpose, then anonymise
or delete it. "Anonymise" here means: redact the person's identity (name, email,
phone, job title) and the free-text of any associated record, while keeping
**de-identified** statistics (deal stage, value, dates, source) that can no longer
be tied to an individual. Once anonymised, the data falls outside the PDPL.

## Retention schedule

| Data category | Where it lives | Retention | At expiry | Enforced by |
|---|---|---|---|---|
| **Inbound enquiry / contact** (and mixed inbound+outbound) | Krayin `persons`/`leads` | 24 months from last activity | Anonymise | `pdpl-retention.sh` (weekly) |
| **Pure outbound prospect** (no inbound engagement, no reply) | Krayin | 12 months from last activity | Anonymise | `pdpl-retention.sh` (weekly) |
| **Client records** (any Won deal) | Krayin | Duration of engagement **+ 7 years** | Manual review then anonymise/delete | DPO (manual; legal/audit hold) |
| **Newsletter / threat-briefing subscribers** | Keila | Until unsubscribe or erasure request | Remove on opt-out | Keila unsubscribe + DSAR |
| **Engagement deliverables** (pentest reports, evidence) | Encrypted store | Per engagement contract (typically 12 months) then secure deletion | Delete | Manual per contract |
| **Billing / invoices** | Finance records | 5 years (UAE commercial/tax law) | Retain then delete | Manual |
| **Email correspondence** | Stalwart | Active mailbox; no auto-purge | Manual housekeeping | Manual |
| **Website server logs / analytics** | VPS / nginx | 90 days | Rotate/delete | Log rotation |
| **AI proposal inputs** (scope notes → Claude) | Anthropic API | Not retained by us beyond the API call; ephemeral cache only | n/a | By design |
| **DSAR audit log** | `ops.pdpl_erasure_log` | Email stored **hashed**; retained as compliance evidence | Retain (no PII) | By design |

## How automated enforcement decides

`scripts/pdpl-retention.sh` (see `docs/compliance/README.md`) groups each person's
leads and:

1. **Excludes clients** — anyone with a lead in a Won stage (P4=20, P5=29, P6=37)
   is never auto-anonymised; the 7-year post-engagement rule is a deliberate
   manual decision (there may be a legal or contractual hold).
2. Applies the **24-month** window if the person has *any* inbound lead, otherwise
   the **12-month** window (pure outbound sources: LinkedIn/Cold-Email/Apollo/
   Founding Outreach — IDs 11–17, 35).
3. Anonymises matched persons + their lead free-text + any organization whose
   every contact is now anonymised.

The warehouse (`raw.persons`) re-syncs from Krayin on the nightly ETL, so it
inherits the anonymisation automatically — the script only touches the source.

**Default is dry-run.** The weekly systemd timer runs it with `--apply`. Run it by
hand any time to preview: `scripts/pdpl-retention.sh` (no flag).

## Client 7-year rule (manual)

When a client relationship ends, tag the account and diarise a review 7 years
after the final engagement. At that review, the DPO either extends (active legal/
tax hold) or anonymises. This is intentionally not automated — ending a client
relationship is a judgement call, not a date arithmetic.
