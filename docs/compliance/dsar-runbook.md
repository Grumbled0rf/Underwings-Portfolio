# Data-Subject Request (DSAR) Runbook

**Owner:** DPO (Manoj Prabhakaran) · **Last updated:** 2026-05-27 · **Review:** annual
**SLA:** respond and complete within **14 days** of a verified request (we set our
own tighter internal SLA than the statutory maximum — confirm the current Data
Office window in the Executive Regulations, and treat the shorter as binding).

Under the PDPL a data subject can ask to **access**, **correct**, **erase**,
**restrict**, or **port** their data, or **object** to processing. A polished
privacy notice means nothing if we can't actually fulfil one — so here is the
runnable process.

## Where requests arrive

- `privacy@underwings.org` → DPO + ops triage (the address published on the site)
- `dpo@underwings.org` → DPO directly
- Any channel (phone, email to a personal address, in person) — whoever receives
  it forwards to `privacy@` the same day.

## The process

### 1. Log + acknowledge (day 0–1)
- Record the request: who, what right, date received. Open a tracking item (Plane,
  or the DSAR log in this folder until Plane automation is wired).
- Acknowledge to the requester in writing, stating the 14-day target.

### 2. Verify identity (before doing anything)
- Confirm the requester is who they say. For a known contact, reply-to the email
  on file and require confirmation from that address. Do **not** action an erasure
  on an unverified request — that is itself a breach risk.

### 3. Locate the data
- Primary store: **Krayin** (`persons`, `leads`, `organizations`).
- Mirror: **warehouse** `raw.persons`.
- Marketing: **Keila** subscriber list (+ Brevo).
- Mail: **Stalwart** mailboxes (correspondence).
- Preview exactly what we hold:
  ```bash
  scripts/pdpl-dsar-erase.sh <their-email>        # DRY-RUN, shows the records
  ```

### 4. Fulfil the right

| Right | Action |
|---|---|
| **Access** | Export their Krayin person + leads + any correspondence; deliver as a readable file. Redact other people's data. |
| **Correction** | Edit the record in Krayin; the warehouse re-syncs nightly. |
| **Erasure** ("be forgotten") | `scripts/pdpl-dsar-erase.sh <email> --apply` — erases across Krayin **and** the warehouse immediately, adds to the outbound suppression list, and writes a hashed audit row. Then **manually** remove from Keila/Brevo and delete relevant mail. |
| **Restriction** | Tag the lead, stop active processing, document the restriction. |
| **Portability** | Provide their data in a structured, machine-readable format (CSV/JSON). |
| **Objection** | Stop the objected-to processing (usually marketing → unsubscribe + suppress). |

### 5. Confirm + close (by day 14)
- Confirm completion to the requester in writing.
- For erasure, note that the hashed audit row in `ops.pdpl_erasure_log` is our
  evidence the request was honoured (it contains **no** clear-text PII).
- Close the tracking item.

## What the erasure script does (and doesn't)

`scripts/pdpl-dsar-erase.sh` is **dry-run by default**; `--apply` writes. It:

- Redacts the Krayin person (name/emails/phone/job title) + their lead free-text.
- Redacts the same person row in the warehouse immediately (no waiting for ETL).
- Adds the email to `uw_outbound_suppression` so we never re-contact them.
- Logs a SHA-256 hash of the email + affected Krayin IDs to `ops.pdpl_erasure_log`.

It does **not** touch Keila/Brevo or mailboxes — those are the manual follow-ups
the script reminds you about in its #ops Slack message. Do them before you confirm
closure.

## Edge cases
- **Legal/tax hold** (active client, unpaid invoice, ongoing dispute): erasure may
  be lawfully refused or deferred for that data. Document the basis and tell the
  requester which data is retained and why.
- **Backups**: encrypted DB backups will still contain the data until they age out
  of the backup retention window. This is acceptable — they are not live, are
  access-controlled, and rotate. Note it in the response if asked.
