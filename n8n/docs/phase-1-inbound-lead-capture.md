# Phase 1 — Inbound Lead Capture

**Status (2026-05-14):** Live end-to-end for the **contact form**. Other forms
still need wiring. Plumbing is ready.

## What's live

```
                                  ┌───────────────────────────────┐
underwings.org/api/contact ─POST→ │  https://n8n.underwings.org   │
(and any future form)             │  /webhook/inbound-lead        │
                                  │                               │
                                  │  1. X-Inbound-Token check     │
                                  │  2. SOURCE_MAP → Krayin IDs   │
                                  │  3. POST http://krayin/       │
                                  │     webhook-lead-create.php   │
                                  │  4. Slack #new-leads ping     │
                                  │     (currently silent —       │
                                  │     credential needed)        │
                                  │  5. Respond 200 {lead_id}     │
                                  └───────────────────────────────┘
```

| Layer | Component | Path / file |
|---|---|---|
| n8n workflow | "01 - Inbound Lead Capture" | `n8n/workflows/01-inbound-lead-capture.json` |
| Krayin endpoint | `webhook-lead-create.php` | `krayin/webhook-lead-create.php` (bind-mounted) |
| Krayin nginx | regex `^/webhook-[a-z0-9-]+\.php$` | `krayin/krayin-nginx.conf` |
| Front-end caller | `pushToKrayinCRM()` | `frontend/src/pages/api/contact.ts` |
| Env vars (frontend) | `N8N_INBOUND_URL`, `N8N_INBOUND_TOKEN` | `docker-compose.yml` + `.env` |
| Env vars (n8n) | `INBOUND_WEBHOOK_TOKEN`, `KRAYIN_WEBHOOK_TOKEN`, `SLACK_CHANNEL_NEW_LEADS` | same |

## The inbound payload contract

POST to `https://n8n.underwings.org/webhook/inbound-lead`
Headers: `Content-Type: application/json`, `X-Inbound-Token: <INBOUND_WEBHOOK_TOKEN>`

```json
{
  "source": "contact_form",
  "person": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+971500000000",
    "company": "Example Co",
    "job_title": "CISO"
  },
  "title": "Optional — defaults to '<source> — <name>/<company>'",
  "description": "Optional free text saved to lead.description",
  "lead_value": 35000,
  "activity_note": "Optional — appended as a Krayin activity on the lead",
  "icp_segment_option_id": 1,
  "attributes": {
    "outbound_confidence_score": "78",
    "scope_token": "abc",
    "scope_reference": "UW-2026-0042"
  }
}
```

### Valid `source` values (drives Krayin pipeline/stage/source/type IDs)

| `source` | Krayin source | Pipeline | Stage | Type |
|---|---|---|---|---|
| `contact_form` | Web Form (3) | 4 | New (13) | New Business (1) |
| `scope_builder` | Scope Builder (6) | 4 | New (13) | One-off (3) |
| `scope_builder_quiz` | Scope Builder Quiz (7) | 4 | New (13) | One-off (3) |
| `adhics_readiness_quiz` | ADHICS Quiz (8) | 4 | New (13) | One-off (3); auto-sets ICP=Healthcare |
| `iso27001_gap_quiz` | ISO 27001 Quiz (9) | 4 | New (13) | One-off (3); auto-sets ICP=ISO |
| `newsletter` | Newsletter Signup (10) | 4 | New (13) | New Business (1) |
| `waitlist` | Web Form (3) | 4 | New (13) | Subscription (4) |
| `partners` | Web Form (3) | 4 | New (13) | New Business (1) |
| `linkedin_manoj` / `_nelson` / `_vinoth` | 11 / 12 / 13 | 4 | New | New Business |
| `cold_email_manoj` / `_nelson` / `_vinoth` | 14 / 15 / 16 | 4 | New | New Business |
| `apollo` / `referral` / `whatsapp` | 17 / 18 / 20 | 4 | New | New Business |

Routing table lives in the `Resolve route` Code node of the workflow — edit there
(then `n8n import:workflow` + restart n8n) when you add new sources.

## How to wire the remaining frontend forms

Each form's existing Astro API route stays in place. Just add a fire-and-forget
call to `notifyN8nInbound()` alongside its existing logic. Pattern below.

### Shared helper

Create `frontend/src/lib/n8n-inbound.ts`:

```ts
const N8N_INBOUND_URL   = import.meta.env.N8N_INBOUND_URL   || process.env.N8N_INBOUND_URL;
const N8N_INBOUND_TOKEN = import.meta.env.N8N_INBOUND_TOKEN || process.env.N8N_INBOUND_TOKEN;

export async function notifyN8nInbound(payload: Record<string, unknown>): Promise<void> {
  if (!N8N_INBOUND_URL || !N8N_INBOUND_TOKEN) return;
  try {
    await fetch(N8N_INBOUND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Inbound-Token': N8N_INBOUND_TOKEN,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('[n8n-inbound] push failed:', e);
  }
}
```

Then refactor `contact.ts` to use it (the inline version is fine for now; this
helper is for the others to reuse).

### newsletter.ts

Inside the existing `Promise.all([...])` block, add:

```ts
notifyN8nInbound({
  source: 'newsletter',
  person: {
    name: cleanEmail.split('@')[0].replace(/[._-]/g, ' '),
    email: cleanEmail,
  },
  title: `Newsletter signup — ${cleanEmail}`,
  activity_note: lead_magnet
    ? `Newsletter signup via lead magnet: ${lead_magnet}`
    : 'Newsletter signup (no lead magnet)',
}),
```

Keep the existing `pushToKeila()` — newsletter delivery still goes through Keila;
n8n only mirrors a low-priority lead into Krayin.

### waitlist.ts

After the existing Supabase insert succeeds:

```ts
await notifyN8nInbound({
  source: 'waitlist',
  person: {
    name: name || email.split('@')[0],
    email,
    company: company || undefined,
  },
  title: `Waitlist — ${serviceSlug || 'unknown'}${serviceYear ? ' (' + serviceYear + ')' : ''}`,
  description: `Service: ${serviceSlug}\nYear: ${serviceYear}\nSource page: ${sourcePage}`,
  activity_note: `Waitlist signup for ${serviceSlug}`,
});
```

### Scope Builder (already has its own webhook)

Two options:

1. **Keep `webhook-scope.php`** for its EAV attribute handling; have the
   frontend ALSO fire `notifyN8nInbound({source:'scope_builder', ...})` so the
   Slack ping happens. The two endpoints will both write to Krayin — adjust one
   to skip lead creation, OR add a `dry_run_krayin: true` flag to the n8n call
   to do Slack-only.
2. **Migrate to n8n only**: drop the scope-builder webhook PHP call from
   `frontend/src/pages/api/scope-submit.ts`; instead send everything via
   `notifyN8nInbound({source:'scope_builder', attributes:{scope_token, ...}})`.
   Cleaner long-term.

Recommended: **option 2**. The `webhook-lead-create.php` endpoint already accepts
arbitrary EAV attributes via the `attributes` field, so it's a drop-in.

## Slack — last mile

The workflow has a Slack node that's set to `continueOnFail: true`, so right now
it silently no-ops. To enable real Slack pings:

1. Slack admin → create a bot at https://api.slack.com/apps
2. Add scopes: `chat:write`, `chat:write.public`
3. Install to workspace → grab the `xoxb-...` bot token
4. In n8n UI → Settings → Credentials → New → "Slack" → paste token →
   rename credential to `Slack - Underwings Bot`
5. Open workflow "01 - Inbound Lead Capture" → Slack node → reselect that
   credential (it'll fill the real credential id, replacing
   `PLACEHOLDER_SLACK_CREDENTIAL_ID`)
6. Set the channel ID: in Slack, right-click `#new-leads` → Copy link →
   ID is the trailing `Cxxxxxxx`. Put it in `.env` as
   `SLACK_CHANNEL_NEW_LEADS=Cxxxxxxx`, then `docker compose up -d n8n`.
7. Save + reactivate the workflow.

## Testing locally

End-to-end smoke test via curl (run from this host):

```bash
INBOUND=$(grep '^INBOUND_WEBHOOK_TOKEN=' /home/deployer/underwings/.env | cut -d= -f2)

curl -sk -X POST https://n8n.underwings.org/webhook/inbound-lead \
  -H "Content-Type: application/json" \
  -H "X-Inbound-Token: $INBOUND" \
  -d '{
    "source": "contact_form",
    "person": {
      "name": "Test User",
      "email": "test@example.com",
      "company": "Test Co"
    },
    "title": "Smoke test"
  }'

# Expect: {"success":true,"lead_id":<N>,"person_id":<N>}
```

Verify the lead landed:

```bash
docker exec underwings-krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin -e \
  "SELECT id, title, lead_source_id FROM leads ORDER BY id DESC LIMIT 5;"
```

## Known issues / follow-ups

- [ ] **Slack credential not configured** — workflow silently skips Slack pings until added.
- [ ] **Test leads 42–45 are in DB** — delete via Krayin UI when convenient.
- [ ] **n8n version is `2.20.7-exp.0`** (experimental). Pin to a stable tag.
- [ ] **N8N_ENCRYPTION_KEY** (in `/home/deployer/underwings/.env`) — back up to a vault. Losing it bricks all stored credentials.
- [ ] **Frontend form wire-ups** (newsletter, waitlist, scope-builder) still pending.
- [ ] **Brevo transactional emails** — skipped for v1 per agreed scope.
- [ ] **Person dedupe by email** — current code does it via O(N) scan of all persons. Fine at <10K persons; replace with a JSON-extract index once larger.
