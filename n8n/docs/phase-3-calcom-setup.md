# Phase 3a — Cal.com → Krayin Booking Handler

**Status (2026-05-15):** Live end-to-end. Signed Cal.com webhook events
update or create Krayin leads at the **Discovery Booked** stage with
meeting metadata stamped on the lead.

## Architecture

```
Cal.com booking event
    │  (HMAC SHA-256 signed)
    ▼
n8n /webhook/calcom-booking
    │
    ├─ Verify HMAC signature (reject on mismatch)
    ├─ Normalize payload (start_time, join_url, booking_uid, ...)
    │
    ├─ Lookup Krayin lead by invitee email
    │     │
    │     ├─ FOUND → webhook-lead-update.php
    │     │           • move stage → Discovery Booked (id 16)
    │     │           • set next_meeting_at, next_meeting_join_url, calcom_booking_uid
    │     │           • activity note with meeting details
    │     │
    │     └─ NOT FOUND → webhook-lead-create.php
    │                     • create new person + lead at stage 16
    │                     • same attributes
    │                     • THEN trigger Phase 2 enrichment so it gets scored
    │
    ├─ Slack #new-leads (continueOnFail — silent until credential added)
    └─ Respond 200 to Cal.com
```

## What's wired

| Component | Path |
|---|---|
| n8n workflow | `n8n/workflows/04-calcom-booking-handler.json` |
| Krayin lookup endpoint | `krayin/webhook-lead-by-email.php` |
| Krayin update + create endpoints | reused from Phase 1/2 |
| New EAV attributes | `next_meeting_at` (id 73), `next_meeting_join_url` (id 74), `calcom_booking_uid` (id 75) |
| Schema script | `scripts/krayin/phase3-attributes.sql` |
| Webhook env | `CALCOM_WEBHOOK_SIGNING_SECRET` in `.env`, passed to `underwings-n8n` |
| n8n crypto access | `NODE_FUNCTION_ALLOW_BUILTIN=crypto` (required for HMAC verify) |

## Register the webhook in Cal.com

1. Open https://book.underwings.org as the admin user (`manoj@underwings.org`)
2. Navigate **Settings → Developer → Webhooks** (URL: `/settings/developer/webhooks`)
3. Click **New**
4. Fill in:
   - **Subscriber URL:** `https://n8n.underwings.org/webhook/calcom-booking`
   - **Secret:** paste the value of `CALCOM_WEBHOOK_SIGNING_SECRET` from `/home/deployer/underwings/.env`. Get it with:
     ```bash
     grep '^CALCOM_WEBHOOK_SIGNING_SECRET=' /home/deployer/underwings/.env | cut -d= -f2
     ```
   - **Active:** ON
   - **Event triggers:** check ALL of these
     - ☑ `BOOKING_CREATED`
     - ☑ `BOOKING_RESCHEDULED`
     - ☑ `BOOKING_CANCELLED`
   - **Payload template:** leave default (raw JSON)
5. **Save**

## Test the live integration

1. Open `https://book.underwings.org/<your-username>/30min` in an incognito browser window
2. Pick any future slot
3. Fill the form with a **personal email** (e.g., a Gmail). Use a recognizable name like "Test Booking 1"
4. Submit
5. Within ~5 seconds, verify in the Krayin admin (https://crm.underwings.org/admin):
   - A new lead titled `Cal.com booking — Test Booking 1` appears at the **Discovery Booked** stage of *UW Cybersecurity Sales*
   - The lead detail shows `Next Meeting At`, `Next Meeting Join URL`, `Cal.com Booking UID`
   - There's an activity note "Meeting booked" with the meeting details
6. From the Cal.com side, **reschedule** the booking. Verify Krayin shows a new "Meeting rescheduled" activity and the `Next Meeting At` updated **without** creating a duplicate lead.
7. **Cancel** the booking. Verify Krayin shows "Meeting cancelled" activity. Stage stays at Discovery Booked (Manoj decides whether to move to Lost — automation doesn't auto-rollback).
8. Cleanup: delete the test booking and mark the test lead as Lost in Krayin.

## What happens behind the scenes

- HMAC: every Cal.com request carries `x-cal-signature-256: <hex>`. n8n
  computes `HMAC_SHA256(secret, raw_body)` and rejects requests where
  the signature doesn't match. Bad-sig requests still get HTTP 200 from
  the webhook (n8n default), but the workflow errors before any Krayin
  write happens.
- Idempotency: reschedule uses the same `uid` → the lookup finds the
  same lead → update path → no duplicate. Cancel uses the same `uid` →
  attrs cleared but lead and stage preserved.
- Enrichment: only fires for **new** leads (not for booking events on
  pre-existing leads — those have already been scored in Phase 2).

## Known limitations / follow-ups

- **Slack credential is still a placeholder.** The "Slack: #new-leads"
  node is gated by `continueOnFail: true` so it silently no-ops. Add
  the bot credential as documented in `phase-1-inbound-lead-capture.md`.
- **No pre-call brief yet.** The Claude-drafted call brief that gets
  emailed to the assigned principal 30 min before the meeting is Phase
  3b. Workflow file: `n8n/workflows/05-calcom-prebrief-cron.json` (not
  yet built).
- **Enrichment can downgrade a stage on edge cases.** If a brand new
  email books a call AND Phase 2 scores them ≥70, the enrichment
  workflow will move the lead from Discovery Booked (16) back to MQL
  (14) because Phase 2 doesn't check current stage. Fix: add a
  current-stage guard to Phase 2's stage-move logic. Low priority —
  bookings are a stronger signal than score anyway.
- **No backfill.** Bookings made before the webhook was registered
  won't appear in Krayin. If you have past test bookings to import,
  do them manually.
- **Empty datetime quirk.** On cancel, `next_meeting_at` is set to
  empty string, which Krayin's EAV stores as `0000-00-00 00:00:00`.
  Cosmetic only.

## Cleanup of test leads

Phase 3a smoke tests created leads 50 (updated via Cal.com synthetic
events) and 53 (new via Cal.com synthetic events). Lead 53 has email
`prospect-new@calcom-test.local` — clearly a test. Delete from Krayin
UI when convenient.

---

# Phase 3b — Pre-call Brief

**Status (2026-05-15):** Live. Every 5 minutes, the cron sweep finds
leads whose meeting is 25-35 min out and hasn't been briefed, asks
Claude Sonnet 4.6 to draft a one-page HTML brief, and emails it to the
assigned principal via Stalwart SMTP. Marks `brief_sent_at` so each
brief sends exactly once.

## Architecture

```
Every 5 min (cron)
    │
    ▼
GET webhook-leads-needing-brief.php
    │   (returns lead context + person + owner email + scoring + activities)
    ▼
Claude Sonnet 4.6 — draft HTML brief (under 350 words)
    │
    ▼
Build email payload (subject + styled HTML wrap)
    │
    ▼
POST webhook-send-brief.php
    │   ├─ Laravel Mail send via Stalwart
    │   ├─ Set brief_sent_at = NOW (idempotency lock)
    │   └─ Append "Pre-call brief sent" activity
    ▼
Done — silent on success, no Slack ping
```

## What's wired

| Component | Path |
|---|---|
| n8n workflow | `n8n/workflows/05-calcom-prebrief-cron.json` |
| Krayin lookup endpoint | `krayin/webhook-leads-needing-brief.php` |
| Krayin send + mark endpoint | `krayin/webhook-send-brief.php` |
| New EAV attribute | `brief_sent_at` (id 76) |
| SMTP auth | newsletter@underwings.org via Stalwart (matches frontend pattern) |
| From address | newsletter@underwings.org (Stalwart enforces sender == auth user) |

## Brief content shape

Claude's output is a constrained HTML email body with these sections:

- `<h2>Pre-call brief — Name / Company</h2>`
- Meeting time + join link
- "Who you're meeting" (who + company snapshot)
- "Why this lead exists" (entry path + AI score reasoning)
- "Suggested talk track (3 questions)"
- "Recommended first offer" (specific service + AED price band)
- "Watch-outs" (risks Manoj should anticipate)

Wrapped in a minimal styled shell for email-client friendliness, with a
"Open lead in Krayin →" link in the footer.

## Test it manually (without waiting for a real booking)

To smoke-test without waiting for Cal.com:

```bash
TOKEN=$(grep '^KRAYIN_WEBHOOK_TOKEN=' /home/deployer/underwings/.env | cut -d= -f2)

# 1. Plant a meeting on an existing lead (replace 53 with your test lead id):
FUTURE=$(date -d '+30 minutes' +'%Y-%m-%dT%H:%M:%S')
curl -sk -X POST https://crm.underwings.org/webhook-lead-update.php \
  -H "Content-Type: application/json" -H "X-Webhook-Token: $TOKEN" \
  -d "{\"lead_id\": 53, \"attributes\": {\"next_meeting_at\": \"$FUTURE\"}}"

# 2. Verify it appears in the needing-brief list:
curl -sk -H "X-Webhook-Token: $TOKEN" \
  "https://crm.underwings.org/webhook-leads-needing-brief.php"

# 3. Wait up to 5 minutes for the cron to fire (or use n8n UI to
# manually execute the workflow). Brief lands in the assigned owner's
# inbox.

# 4. To re-test, clear the brief flag:
docker exec underwings-krayin-db mariadb -ukrayin -p... krayin -e \
  "DELETE FROM attribute_values WHERE entity_type='leads' AND entity_id=53
   AND attribute_id=(SELECT id FROM attributes WHERE code='brief_sent_at');"
```

## Known limitations / follow-ups

- **Sender quirk**: Stalwart enforces `From == auth user`. Briefs come
  from `newsletter@underwings.org` displayed as "Underwings CRM". To
  send from `crm@underwings.org` later, either create that mailbox in
  Stalwart with its own credentials, or add an alias rule.
- **No web research**: brief uses only what Krayin already knows about
  the lead. Add Claude web search in a follow-up to enrich
  company/person context.
- **No Plane card creation**: deferred. The principal still has to
  manually create their internal task for the call.
- **Cron lag**: bookings made within 25 minutes of the meeting time
  will get the brief late or not at all. Acceptable for now (people
  generally book days in advance, not 20 minutes out).
- **Owner fallback**: if a lead has no owner (`user_id = NULL`) the
  endpoint defaults to `admin@underwings.org`. Once Manoj/Nelson/Vinoth
  are routed by segment in Phase 5, this becomes mostly cosmetic.

---

# Phase 3c — Plane card on booking

**Status (2026-05-15):** Wired in workflow 04 but **dormant until you
provide Plane API credentials**. The Plane branch detects missing env
vars and skips silently — bookings still get captured + briefed.

## What it does

When a Cal.com booking is **created** (not on reschedule, not on cancel),
n8n creates a Plane work-item in your designated project:

- **Title**: `Discovery: <Name> / <Company>`
- **Description (HTML)**: meeting time + join link + invitee details +
  notes + a deep-link "Open lead in Krayin →"
- **Target date**: meeting date
- **External ID**: the Cal.com booking UID (so future automations can
  match Plane cards to bookings)
- **External source**: `calcom`

The Plane card UUID is stored back on the lead as the `plane_card_id`
attribute (id 77) for traceability.

## What you need to do (~5 min)

1. **Create or pick a Plane project** — open https://plan.underwings.org,
   pick the workspace, and create a project like "Sales — Discovery
   Calls" if you don't have a suitable one already.

2. **Find your workspace slug + project ID**:
   - Open the project. URL looks like
     `https://plan.underwings.org/<workspace-slug>/projects/<project-uuid>/issues`
   - The bit between `/` and `/projects/` is your **workspace slug**
     (probably `underwings`).
   - The UUID after `/projects/` is your **project ID**.

3. **Generate a workspace API token**:
   - Plane → **Workspace Settings → Developer settings → Access Tokens**
   - Click **Create token** → name it `n8n-bookings` → copy the token
     (shown once)

4. **Paste into `/home/deployer/underwings/.env`**:
   ```bash
   PLANE_API_TOKEN=plane_api_xxxxx        # the token from step 3
   PLANE_BASE_URL=https://plan.underwings.org    # already set
   PLANE_WORKSPACE_SLUG=underwings        # from step 2
   PLANE_PROJECT_ID=<uuid>                # from step 2
   ```

5. **Apply**:
   ```bash
   cd /home/deployer/underwings && docker compose up -d n8n
   ```

6. **Test**: send a synthetic booking with curl (same recipe as Phase
   3a section above). Check Plane for a new card.

## Sanity check the env

```bash
docker exec underwings-n8n sh -c \
  'echo PLANE_API_TOKEN=${PLANE_API_TOKEN:0:6}...; \
   echo PLANE_PROJECT_ID=$PLANE_PROJECT_ID; \
   echo PLANE_WORKSPACE_SLUG=$PLANE_WORKSPACE_SLUG'
```

If any of `PLANE_API_TOKEN`, `PLANE_PROJECT_ID`, `PLANE_WORKSPACE_SLUG`
is blank, the workflow will silently skip card creation — by design.

## What's deferred (Phase 3c.1)

- **Reschedule → update card**: when a booking is rescheduled, we
  currently leave the Plane card alone. Could PATCH the card's target
  date + add a comment.
- **Cancel → close card**: when a booking is cancelled, we leave the
  card open. Could close it or add a "cancelled" comment.
- **Per-practitioner project routing**: all cards go to one project for
  now. Once Manoj/Nelson/Vinoth get their own boards, route by lead
  owner.
- **Assignee mapping**: Plane card is unassigned. Map Krayin owner →
  Plane user once we have all three principals registered in Plane.

## Workflow node positions

The new Plane chain lives at the bottom-right of workflow 04:

```
… ─► Update existing lead ──┬─► Slack
                            ├─► Respond OK
                            └─► Build Plane card ─► Plane: create card ─► Save plane_card_id
   ─► Create new lead ──────┬─► Trigger enrichment
                            ├─► Slack
                            ├─► Respond OK
                            └─► Build Plane card ─► (same chain)
```

Both Update and Create paths feed into the same `Build Plane card` node;
since the Switch upstream is mutually exclusive, only one branch runs
per booking.
