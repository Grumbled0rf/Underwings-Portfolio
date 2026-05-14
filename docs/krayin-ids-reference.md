# Krayin CRM — ID Reference for n8n Automations

**Generated:** 2026-05-14
**Krayin URL:** https://crm.underwings.org
**DB host (from inside `underwings-network`):** `krayin-db:3306`
**Database:** `krayin` · **User:** `krayin` · password in `/home/deployer/underwings/docker-compose.yml`
**API access:** Krayin REST API is **NOT installed**. All n8n integrations talk to MariaDB
directly via the MySQL node (Option C). DO NOT attempt `/api/v1/*` calls — they 404.

> ⚠️ The plan doc lists P5 as "Subscriptions" and P6 as "Software Resale".
> The DB has them the other way round. The DB is authoritative; treat the
> plan doc as needing an update (`P5 = Software Resale`, `P6 = Subscriptions`).

---

## Pipeline 4 — UW Cybersecurity Sales
- **Pipeline ID:** 4
- **Rotten Days:** 30
- **Use for:** one-off projects (pen tests, ISO implementations, awareness training)

| Sort | Stage Name | Stage ID | Probability % |
|---|---|---|---|
| 1 | New | 13 | 10 |
| 2 | MQL | 14 | 20 |
| 3 | Contacted | 15 | 30 |
| 4 | Discovery Booked | 16 | 50 |
| 5 | Scoping | 17 | 60 |
| 6 | Proposal Sent | 18 | 70 |
| 7 | Negotiation | 19 | 85 |
| 8 | Won | 20 | 100 |
| 9 | Lost | 21 | 0 |

---

## Pipeline 5 — UW Software Resale
- **Pipeline ID:** 5
- **Rotten Days:** 21
- **Use for:** license sales + deployment (Sophos, Fortinet, Securonix, Wazuh, etc.)

| Sort | Stage Name | Stage ID | Probability % |
|---|---|---|---|
| 1 | New | 22 | 15 |
| 2 | Requirements Gathered | 23 | 30 |
| 3 | Vendor Shortlist | 24 | 45 |
| 4 | Quote Sent | 25 | 60 |
| 5 | PO Pending | 26 | 80 |
| 6 | Ordered | 27 | 90 |
| 7 | Deployed | 28 | 95 |
| 8 | Won | 29 | 100 |
| 9 | Lost | 30 | 0 |

---

## Pipeline 6 — UW Subscriptions
- **Pipeline ID:** 6
- **Rotten Days:** 14
- **Use for:** PTaaS (AED 6K/mo) + Continuous Compliance (AED 4K/mo).
  "Trial" = one paid month with 30-day exit clause, not free work.

| Sort | Stage Name | Stage ID | Probability % |
|---|---|---|---|
| 1 | New | 31 | 15 |
| 2 | Qualified | 32 | 30 |
| 3 | Demo Booked | 33 | 50 |
| 4 | Trial Offered | 34 | 65 |
| 5 | Trial Active | 35 | 80 |
| 6 | Contract Sent | 36 | 90 |
| 7 | Won | 37 | 100 |
| 8 | Lost | 38 | 0 |

---

## Lead Sources

| Source Name | Source ID |
|---|---|
| Email | 1 |
| Web | 2 |
| Web Form | 3 |
| Phone | 4 |
| Direct | 5 |
| Scope Builder | 6 |
| Scope Builder Quiz | 7 |
| ADHICS Readiness Quiz | 8 |
| ISO 27001 Gap Quiz | 9 |
| Newsletter Signup | 10 |
| LinkedIn Outbound - Manoj | 11 |
| LinkedIn Outbound - Nelson | 12 |
| LinkedIn Outbound - Vinoth | 13 |
| Cold Email - Manoj | 14 |
| Cold Email - Nelson | 15 |
| Cold Email - Vinoth | 16 |
| Apollo Outbound | 17 |
| Referral | 18 |
| Pipeline 1 Upsell | 19 |
| WhatsApp | 20 |

---

## Lead Types

| Type Name | Type ID |
|---|---|
| New Business | 1 |
| Existing Business | 2 |
| One-off Project | 3 |
| Subscription | 4 |
| Software Resale | 5 |
| Multi-service | 6 |

---

## Users (Team)

| Name | User ID | Email | Role |
|---|---|---|---|
| Admin | 1 | admin@underwings.org | Administrator |
| Manoj | 2 | manoj@underwings.org | Administrator |
| Gowtham | 3 | gowtham@underwings.org | Member |
| Kumaraguru | 4 | kumaraguru@underwings.org | Member |
| Nelson | 5 | nelson@underwings.org | Administrator |
| Vinoth | 6 | vinoth@underwings.org | Administrator |

**Placeholder passwords:** Nelson and Vinoth were seeded with `ChangeMe-2026!`
(bcrypt-hashed). Both must reset their password via the Krayin login → "Forgot
Password" flow on first sign-in.

---

## Custom Lead Attributes

| Attribute ID | Code | Label | Type | Options |
|---|---|---|---|---|
| 69 | `icp_segment` | ICP Segment | select | Healthcare, ISO, PDPL, Other |
| 70 | `outbound_confidence_score` | Outbound Confidence Score | text (numeric) | 0–100 |

Existing scope-builder attributes (pre-existing, do not touch):

| Attribute ID | Code | Label | Type |
|---|---|---|---|
| 61 | `scope_token` | Scope Token | text |
| 62 | `scope_reference` | Scope Reference | text |
| 63 | `scope_range_low` | Range Low (AED) | text |
| 64 | `scope_range_high` | Range High (AED) | text |
| 65 | `founding_optin` | Founding Client | boolean |
| 66 | `scope_view_count` | View Count | text |
| 67 | `scope_last_viewed_at` | Last Viewed At | datetime |
| 68 | `cart_summary` | Cart Summary | textarea |

> Custom attribute *values* on each lead are stored in the per-entity value tables
> Krayin builds dynamically. For inserting `icp_segment` values via n8n, use the
> Krayin admin "Edit Lead" form behavior as a reference (the value is stored as
> the `attribute_option_id`, not the option name).

---

## n8n MySQL credential template

In n8n → Credentials → "MySQL", create one called **Krayin DB**:

```
Host:     krayin-db
Port:     3306
Database: krayin
User:     krayin
Password: <from /home/deployer/underwings/docker-compose.yml — krayin-db service>
SSL:      Disable (internal network only)
```

Confirmed reachable from `underwings-n8n` over `underwings-network`.

---

## Suppression / safety lists (build for Phase 2)

These tables don't exist yet — to be created when needed:
- `uw_outbound_suppression` (email, reason, suppressed_at)
- `uw_outbound_log` (lead_id, channel, sent_at, sequence_step)

---

*Schema audited live on 2026-05-14 against `underwings-krayin-db` (MariaDB 11).
If you change pipelines, sources, types, or attributes via the Krayin UI later,
re-run `scripts/krayin/dump-ids.sh` to refresh this file.*
