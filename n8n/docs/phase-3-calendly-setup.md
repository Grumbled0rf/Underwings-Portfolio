# Phase 3 — Calendly Setup Guide

Get Calendly wired up so booked calls flow into Krayin and trigger a Claude-drafted call brief.

**Your booking page:** https://calendly.com/contact-underwings/30min

---

## What we're building

```
Lead books a call ─→ Calendly fires webhook
                          │
                          ▼
                  n8n /webhook/calendly-booking
                          │
            ┌─────────────┼──────────────┬───────────────┐
            ▼             ▼              ▼               ▼
   Match lead by    Move stage to   Claude drafts   Save brief to
   email in Krayin  Discovery Bkd   call brief      Drive + email
                        (id 16)     (web search +   to principal
                                     past notes)    30 min before
```

---

## Step 1 — Calendly plan check (1 min)

Webhooks require **Calendly Standard plan or higher** (the free Basic plan does NOT include the API). If you're on Basic:
- Go to https://calendly.com/upgrade
- Standard is ~$10/user/month and includes API + webhooks
- If you're already on Standard/Teams/Enterprise, skip ahead.

Confirm you're on a paid plan at https://calendly.com/app/admin/billing.

---

## Step 2 — Get your Personal Access Token (2 min)

1. Go to https://calendly.com/integrations/api_webhooks
2. Under **Personal access tokens**, click **Generate new token**
3. Give it a name like `n8n-underwings`
4. **Copy the token immediately** — you can't see it again. Format: `eyJ...` (JWT-like, ~700 chars)
5. Paste it into `/home/deployer/underwings/.env`:

   ```bash
   echo "CALENDLY_API_TOKEN=eyJ_paste_token_here" >> /home/deployer/underwings/.env
   ```

---

## Step 3 — Get your User URI + Organization URI (1 min)

Calendly's webhook API needs to know whose calendar to subscribe to. Run this once:

```bash
TOKEN=$(grep '^CALENDLY_API_TOKEN=' /home/deployer/underwings/.env | cut -d= -f2)
curl -s https://api.calendly.com/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
```

You'll see something like:
```json
{
  "resource": {
    "uri":               "https://api.calendly.com/users/AAAAAAAAA",
    "name":              "Underwings",
    "slug":              "contact-underwings",
    "scheduling_url":    "https://calendly.com/contact-underwings",
    "current_organization": "https://api.calendly.com/organizations/BBBBBBBB"
  }
}
```

Save both URIs:
```bash
cat >> /home/deployer/underwings/.env <<EOF
CALENDLY_USER_URI=https://api.calendly.com/users/AAAAAAAAA
CALENDLY_ORG_URI=https://api.calendly.com/organizations/BBBBBBBB
EOF
```

---

## Step 4 — Create the webhook subscription (2 min)

This tells Calendly to POST every booking event to n8n. **I'll do this step** once you've added the env vars in Step 2/3 — just say "Calendly env is set" and I'll run:

```bash
# (Claude will run this on your behalf)
TOKEN=$(grep '^CALENDLY_API_TOKEN=' .env | cut -d= -f2)
ORG=$(grep '^CALENDLY_ORG_URI=' .env | cut -d= -f2)
USER=$(grep '^CALENDLY_USER_URI=' .env | cut -d= -f2)
SIGNING_KEY=$(openssl rand -hex 32)
echo "CALENDLY_SIGNING_KEY=$SIGNING_KEY" >> .env

curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\":          \"https://n8n.underwings.org/webhook/calendly-booking\",
    \"events\":       [\"invitee.created\", \"invitee.canceled\"],
    \"organization\": \"$ORG\",
    \"user\":         \"$USER\",
    \"scope\":        \"user\",
    \"signing_key\":  \"$SIGNING_KEY\"
  }"
```

Calendly will return a `200` with the subscription URI. The signing key is what n8n uses to verify the webhook is genuinely from Calendly (HMAC-SHA256 in the `Calendly-Webhook-Signature` header).

---

## Step 5 — Understand the payload (reference only)

Booking event payload Calendly will send:

```json
{
  "event": "invitee.created",
  "created_at": "2026-05-20T10:30:00Z",
  "payload": {
    "uri":   "https://api.calendly.com/scheduled_events/EVENT_UUID/invitees/INVITEE_UUID",
    "name":  "Jane Doe",
    "email": "jane@example.com",
    "first_name": "Jane",
    "last_name":  "Doe",
    "status": "active",
    "questions_and_answers": [
      { "question": "Company", "answer": "Example Co" },
      { "question": "What can we help with?", "answer": "..." }
    ],
    "scheduled_event": {
      "uri":        "https://api.calendly.com/scheduled_events/EVENT_UUID",
      "name":       "Underwings — 30min Intro",
      "start_time": "2026-05-22T11:00:00Z",
      "end_time":   "2026-05-22T11:30:00Z",
      "location":   { "type": "google_conference", "join_url": "https://meet.google.com/..." }
    },
    "tracking": {
      "utm_source": "scope_builder",
      "utm_campaign": "..."
    }
  }
}
```

The n8n workflow will:
1. Verify the HMAC signature
2. Look up the existing Krayin lead by `payload.email`
3. If found → move to `Discovery Booked` (stage id 16). If not found → create a new lead with source = Web Form, then move it.
4. Fire a sub-workflow that asks Claude to research the company + draft a call brief

---

## Step 6 — Test it (after Step 4)

After I set up the subscription, you can verify by booking a test call on your own page:

1. Open https://calendly.com/contact-underwings/30min in an incognito window
2. Pick any slot, fill in a different email (e.g. your personal Gmail)
3. Submit
4. Within ~5 seconds: check Krayin → the lead should be in stage `Discovery Booked`
5. Check `#sales-pipeline` in Slack for the brief notification (once Slack credentials are set)

Cancel the test booking afterwards so it doesn't clog your calendar.

---

## What you need to do RIGHT NOW

```
[ ] Confirm Calendly plan is Standard or higher
[ ] Step 2: Generate Personal Access Token, paste into .env as CALENDLY_API_TOKEN
[ ] Step 3: Run the /users/me curl, paste both URIs into .env
[ ] Reply "Calendly env is set" and I'll do Step 4 (webhook subscription) + start building the n8n workflow
```

---

## Bonus prereqs for Phase 3 (parallel)

While you're in Calendly, also grab:

### Brevo API key (for proposal emails + call confirmations)
1. Go to https://app.brevo.com/settings/keys/api
2. Click **Generate a new API key**
3. Name: `n8n-underwings`
4. Copy and add to `.env`:
   ```
   BREVO_API_KEY=xkeysib-paste_here
   ```

### Drive choice
Decide where call briefs should be saved:
- **Google Drive** — needs OAuth setup; I'll guide you through it when we get there.
- **Nextcloud** (`drive.underwings.org`) — already running on your server; uses WebDAV, simpler from n8n.
- **Just email it** — skip Drive entirely; Claude drafts the brief and it's emailed to the principal. Briefs aren't permanent assets anyway.

Recommended: **email-only for v1**, add Drive in a follow-up if Manoj wants a searchable archive.

### Slack (deferred from Phase 1)
The bot token + channel IDs are still pending. Same to-do as before:
- Slack bot token (`xoxb-...`) → add as n8n credential
- Channel IDs for `#sales-pipeline`, `#new-leads`, `#hot-leads-manoj`
