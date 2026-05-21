# Runbook — Slack workspace + channels + webhooks

> **Purpose:** unblock 6 places in the build that need Slack to post
> notifications. Cost: free (Slack Pro is not needed at our scale).
> **Audience:** founder (browser only).
> **Time:** ~10 minutes (today's scope). Add 5 min later when Phase I starts.

## What this unblocks

| Phase | Workflow / script | Channel it posts to |
|---|---|---|
| A | Monday reconciliation cron (in workflow 14 or new) | `#ops` |
| B | `14-daily-ops-summary.json` (08:00 daily) | `#ops` |
| C | `07-proposal-generator.json` (proposal sent / halt alerts) | `#sales-pipeline` |
| C | `08-onboarding-kickoff.json` (signed deal) | `#client-success` |
| G | `backup-databases.sh` (failure alert) | `#ops` |
| G | `export-n8n-workflows.sh` (drift alert) | `#ops` |
| I (later) | Outbound reply detector — every "interested" reply, any practitioner | `#hot-leads-manoj` (Manoj triages + forwards to Nelson / Vinoth) |
| 1 (already shipped) | `01-inbound-lead-capture.json` (new lead) | `#new-leads` |

## Step 1 — Create the workspace (3 min)

1. Go to https://slack.com/get-started → **Create a new workspace**.
2. Use a founder email (e.g. `manoj@underwings.org`) so the account
   belongs to the company, not a personal address.
3. Workspace name: **Underwings**.
4. Workspace URL: `underwings.slack.com` (it'll auto-suggest a free
   subdomain).
5. Skip "Add coworkers" for now — Nelson + Vinoth can be added later.
6. Skip "What is your team working on" prompts.
7. Skip "Create your first channel" — we make them all next, properly.

## Step 2 — Create the channels (~3 min)

In the Slack desktop or web app, click the **+** next to "Channels"
and create each below. All **Public** within the workspace (only the
3 of you are in the workspace anyway).

**Create now (4 channels — needed for B, C, G):**

| Channel | Purpose | Volume |
|---|---|---|
| `#ops` | Reconciliation, backups, drift, system alerts | 2–5/day |
| `#sales-pipeline` | Proposal sent, drafts ready, halts | 5–10/day |
| `#new-leads` | Every new Krayin lead | 10–20/day |
| `#client-success` | Signed deals, onboarding, day-7/30/90 check-ins | 1–3/day |

**Create now if you want, otherwise defer to Phase I (~2-3 months out):**

| Channel | Purpose | Volume |
|---|---|---|
| `#hot-leads-manoj` | **All** "interested" replies from cold outbound — Manoj triages + forwards to Nelson / Vinoth when relevant | 1–3/day |

**Decision noted (2026-05-21):** single hot-leads channel, owned by Manoj
as head of sales. Per-practitioner channels (`#hot-leads-nelson`,
`#hot-leads-vinoth`) **not created** — Manoj is the funnel-top for all
cold-outbound responses regardless of which practitioner sent the
opening message. Master plan §8 updated to match.

## Step 3 — Create one Slack app (3 min)

Slack's incoming-webhook URLs are issued by Slack "apps". One app
covers all 6 channels.

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**.
2. App name: `Underwings Bot`.
3. Pick workspace: Underwings.
4. After creation, you land on the app config page.

## Step 4 — Enable Incoming Webhooks + create 6 URLs (5 min)

1. In the left sidebar of the app config page → **Incoming Webhooks**.
2. Toggle **Activate Incoming Webhooks** → **On**.
3. Scroll down → **Add New Webhook to Workspace**.
4. Pick the channel `#ops` → **Allow**.
5. Slack returns a webhook URL like
   `https://hooks.slack.com/services/T0XXXX/B0XXXX/longrandomtoken`. Copy it.
6. Click **Add New Webhook to Workspace** again, pick `#sales-pipeline`,
   allow, copy.
7. Repeat for `#new-leads` and `#client-success`.
8. If you created `#hot-leads-manoj`, add a 5th webhook for it. Otherwise
   defer this one to Phase I.

You'll end up with 4 (or 5) URLs. Save them in a temporary doc — you'll
paste them to claude-code at the end of this runbook.

## Step 5 — Test one webhook (1 min)

From any terminal, with one of the URLs:

```bash
curl -X POST -H 'Content-Type: application/json' \
  --data '{"text":"hello from setup test"}' \
  https://hooks.slack.com/services/T0XXXX/B0XXXX/yourtoken
```

You should see "hello from setup test" appear in the channel within a second.

## Step 6 — Paste URLs back to claude-code

Reply in the conversation with this format (replace placeholders with
your actual URLs). Include the hot-leads line only if you created that
channel today:

```
SLACK_OPS_WEBHOOK=https://hooks.slack.com/services/T.../B.../...
SLACK_SALES_WEBHOOK=https://hooks.slack.com/services/T.../B.../...
SLACK_NEW_LEADS_WEBHOOK=https://hooks.slack.com/services/T.../B.../...
SLACK_CS_WEBHOOK=https://hooks.slack.com/services/T.../B.../...
SLACK_HOT_LEADS_MANOJ_WEBHOOK=https://hooks.slack.com/services/T.../B.../...   # optional
```

claude-code will:
1. Append all 6 to `.env` (gitignored — won't leak).
2. Restart n8n + the relevant scripts so they pick up the new env.
3. Test each webhook by triggering a real alert.
4. Activate workflow `14-daily-ops-summary` (the daily 08:00 summary).
5. Update the master plan §11 + §13 to remove "Slack workspace pending"
   from the blockers.

## Step 7 — Invite Nelson + Vinoth (1 min, optional)

Slack workspace sidebar → **Add coworkers** → enter their `@underwings.org`
emails. They get invite emails and join the workspace + all the
public channels above.

---

## Cost

Slack Free covers:
- Up to 90 days message history (more than enough for ops alerts)
- 10 apps installed (we use 1 — Underwings Bot)
- 1:1 voice + video huddles
- Unlimited public channels
- Unlimited members

You will hit "free plan limitations" when you want longer message
retention or want to integrate >10 apps. At that point, Slack Pro is
~AED 28/month per active member. For a 3-person team, Slack Free is
fine for ≥ 12 months.

## If Slack feels heavy — alternative: Telegram

Same outcome, different chat tool. Heavy use in MENA. Cost: free.

1. Create a Telegram bot via @BotFather. You get a bot token.
2. Create 6 groups (`Underwings Ops`, `Underwings Sales Pipeline`, etc.).
3. Add the bot to each group.
4. Get each group's chat_id by running `getUpdates` on the bot.
5. Webhooks become: `POST https://api.telegram.org/bot<token>/sendMessage`
   with `{chat_id, text}`.

I'll add a `runbooks/telegram-setup.md` if you want to go this route
instead. Reply with "Telegram instead" and we'll switch.

## What happens if you do nothing

The stack runs fine — Slack is **purely alerting**. No business
function depends on it. The cost of not having Slack:

- You won't be alerted to a new lead until you check Krayin manually.
- Backup failures will only show up in `journalctl -u backup-databases`
  (we check it manually, no push notification).
- Workflow drift won't surface until someone runs `export-n8n-workflows.sh --quiet`
  by hand.

That's "you check things manually" not "things are broken". So this
is genuinely a "do when you have 15 minutes" task, not blocking.
