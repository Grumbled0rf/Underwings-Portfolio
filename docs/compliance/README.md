# Underwings — Internal PDPL Compliance Pack

This folder is **our own** compliance posture under the UAE Personal Data
Protection Law (Federal Decree-Law No. 45 of 2021). We sell PDPL implementation;
this is us practising what we preach. It is also the working evidence we show a
prospect who asks "are *you* compliant?" during a sales conversation.

> Scope: Underwings Cybersecurity Solutions, onshore Abu Dhabi. We are subject to
> the **federal PDPL** (not DIFC/ADGM). Confirm this still holds if the legal
> entity moves to a free zone.

| Artifact | What it is | Owner | Review cadence |
|---|---|---|---|
| [data-retention-policy.md](data-retention-policy.md) | How long we keep each data category and what happens at expiry | DPO (Manoj) | Annual |
| [ropa.md](ropa.md) / [ropa.csv](ropa.csv) | Record of Processing Activities — every personal-data flow we run | DPO | Quarterly |
| [dsar-runbook.md](dsar-runbook.md) | Operational process for access / erasure / correction requests, 14-day SLA | DPO | Annual |
| [breach-response-plan.md](breach-response-plan.md) | Incident process aligned to the Data Office notification timeline | DPO + Ops | Annual + after any incident |

## The automation behind these documents

A policy with no operational backing is the #1 PDPL mistake (see our own public
[PDPL guide](../blog/uae-pdpl-compliance-guide.md)). So these are wired to code:

- **Retention enforcement** — `scripts/pdpl-retention.sh` anonymises expired,
  non-client records in Krayin weekly (`deploy/pdpl-retention.timer`, Sun 03:17
  Asia/Dubai). Dry-run by default; the timer runs it with `--apply`.
- **Right to erasure** — `scripts/pdpl-dsar-erase.sh <email>` erases one data
  subject across Krayin **and** the warehouse immediately, adds them to the
  outbound suppression list, and writes a hashed audit row to
  `ops.pdpl_erasure_log`. Dry-run by default; `--apply` to execute.

## Contacts

- **DPO:** Manoj Prabhakaran — `dpo@underwings.org`
- **Data-subject requests:** `privacy@underwings.org` (→ DPO + ops triage)

## Known gaps / human input still required

- **Hosting location of the VPS** must be confirmed and recorded in the RoPA
  (determines whether the primary store is even a cross-border transfer).
- **Sub-processor agreements (SCCs/DPAs)** with Brevo, Anthropic, and Cloudflare
  should be downloaded and filed alongside these docs.
- **DPIA** for any future large-scale or sensitive processing (none today).
- **Staff awareness sign-off** — once there are staff beyond the founders.
