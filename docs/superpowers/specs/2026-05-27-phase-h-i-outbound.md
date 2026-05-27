# Phase H/I — Outbound automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status:** SHOVEL-READY, GATED. Do **not** start until BOTH gates are open
> (see Guardrails). Written 2026-05-27 while the rest of the automation stack is
> complete, so the day client #1 signs, this is ready to execute.

**Goal:** Stand up compliant, deliverable cold outbound (email + LinkedIn) for
all three practitioners — harvest → AI score+draft → human approve → send →
classify replies — without burning domain reputation or the budget.

**Architecture:** Sidecar-first, exactly like Phase C. All logic lives in the
`pandoc-render` sidecar as testable pure functions + thin HTTP endpoints; n8n is
reduced to cron-trigger → HTTP → branch → notify. This avoids the n8n version
fragility that cost ~10 round-trips on workflow 07 (see
`2026-05-23-workflow-07-rewrite.md` and the `feedback_n8n_workflow_fragility`
memory). Drafts wait in a review table; a human approves before anything sends.

**Tech Stack:** Node 18 `node:test` (built-in, zero new deps), Express, mysql2,
pg (all already in the sidecar), Brevo transactional API (new key), Apollo.io +
PhantomBuster (external, provisioned in Phase H), Anthropic Claude (`callClaude`,
already wired).

---

## Guardrails (NON-NEGOTIABLE — carried from master plan §5 + §7-H/I)

These are the reason this plan is gated. An executor MUST confirm all of them
before Task I1.

1. **Gate 1 — first paying client signed.** Phase I's master-plan prerequisite.
   No cold sending before there is a reference/case study to point to.
2. **Gate 2 — inbound not saturating capacity.** Phase H follows Phase D only if
   inbound + referral is below target. If inbound already fills the calendar,
   outbound is wasted reputation risk.
3. **≤ 25 sends/day/mailbox.** Hard cap, enforced in code (Task I2).
4. **Human-in-the-loop on every first touch for the first 90 days.** Nothing
   sends from a draft until a human flips it to `approved` (Task I5).
5. **Skip leads with Claude confidence < 60.** No fake personalisation (Task I3).
6. **DPO contact + one-click unsubscribe in every send** (Task I5 body builder).
7. **Dedicated sending subdomain**, never the transactional/marketing domain
   (Task H1). A blocklist hit or SpamAssassin > 5 is a kill-criterion: pause.

---

## Reused, already-built assets (do NOT rebuild)

| Asset | Where | Use |
|---|---|---|
| `callClaude(systemBlocks, userMessage)` | `pandoc-render/server.js:193` | scoring, drafting, reply classification |
| `logClaudeSpend({workflow,model,usage,leadId,note})` | `server.js:341` | cost tracking → `ops.claude_api_calls` |
| `requireToken(req,res)` | `server.js:76` | `X-Shared-Token` auth on every endpoint |
| `uw_outbound_suppression` (email,reason,score,lead_id,suppressed_at,notes) | krayin-db | dedup / unsubscribe / erasure list |
| `uw_outbound_log` (lead_id,email,channel,sequence_step,practitioner,sent_at,reply_at,reply_sentiment) | krayin-db | send + reply ledger |
| Krayin lead sources | `docs/krayin-ids-reference.md` | Cold Email Manoj=14 / Nelson=15 / Vinoth=16 · Apollo=17 · LinkedIn 11/12/13 |
| Pipeline 4 stages | same | New=13, MQL=14, Discovery Booked=16 |
| Slack webhooks in `.env` | — | `SLACK_NEW_LEADS_WEBHOOK`, `SLACK_HOT_LEADS_MANOJ_WEBHOOK`, `SLACK_OPS_WEBHOOK`, `SLACK_SALES_WEBHOOK` |
| `scripts/pdpl-dsar-erase.sh` | — | already writes erased emails INTO `uw_outbound_suppression` — the suppression filter (Task I1) therefore honours erasure for free |

---

## File Structure

- Create: `pandoc-render/outbound.js` — pure, network-free functions (filter,
  cap, prompt builders, classifier parser). One responsibility: outbound logic
  that can be unit-tested without I/O.
- Create: `pandoc-render/test/outbound.test.js` — `node:test` suite for the above.
- Modify: `pandoc-render/server.js` — add 4 thin endpoints that wire `outbound.js`
  + existing helpers to MySQL/Brevo/Claude.
- Create: `prompts/outbound-scoring.md`, `prompts/outbound-drafting.md`,
  `prompts/outbound-reply-classify.md` — Claude system prompts (mounted read-only
  at `/data/prompts`).
- Create: `pandoc-render/migrations/001-outbound-draft.sql` — the review-queue
  table.
- Create: `n8n/workflows/15-apollo-harvest.json`, `16-outbound-send.json`,
  `17-reply-detector.json` — thin trigger workflows.
- Modify: `pandoc-render/Dockerfile` — add a `test` build stage hook (run
  `node --test` in CI), no runtime change.
- Modify: `docs/krayin-ids-reference.md` — note the new draft table.
- Create: `docs/sales/outbound-runbook.md` — the Phase H human checklist (Task H8).

---

# PART A — Phase H: Prerequisites (ops runbook, ~6 weeks calendar)

Phase H is mostly external setup and calendar time (warmup), not code. Each task
has a concrete **verification** so "done" is provable, not asserted. Capture the
whole thing in `docs/sales/outbound-runbook.md` as you go.

### Task H1: Dedicated outbound sending subdomain

**Files:** Stalwart config (`stalwart/config/`), Cloudflare DNS (external).

- [ ] **Step 1: Pick + create the subdomain.** Use `outreach.underwings.org`
  (NOT `mail.` which carries transactional reputation). Add it as a Stalwart
  domain via the management API:
  ```bash
  ADMINPASS=$(grep -E '^MAIL_ADMIN_PASS=' .env | cut -d= -f2-)
  docker run --rm --network underwings_underwings-network curlimages/curl:latest -s \
    -u "admin:$ADMINPASS" -X POST http://underwings-mail:8080/api/principal \
    -H 'Content-Type: application/json' \
    -d '{"type":"domain","name":"outreach.underwings.org","description":"dedicated cold-outbound sending domain"}'
  ```
- [ ] **Step 2: Publish SPF/DKIM/DMARC for the subdomain in Cloudflare.**
  - SPF: `outreach.underwings.org TXT "v=spf1 include:spf.brevo.com -all"`
  - DKIM: take the selector record Brevo shows for this subdomain in its UI.
  - DMARC: `_dmarc.outreach.underwings.org TXT "v=DMARC1; p=quarantine; rua=mailto:dpo@underwings.org"`
- [ ] **Step 3: Verify DNS propagated.**
  Run: `dig +short TXT outreach.underwings.org; dig +short TXT _dmarc.outreach.underwings.org`
  Expected: the SPF and DMARC strings above are returned.
- [ ] **Step 4: Verify DKIM via a test.** Send one mail from the new domain to a
  Gmail account; in Gmail "Show original", confirm `SPF: PASS`, `DKIM: PASS`,
  `DMARC: PASS`.

### Task H2: Email warmup (≥ 3 weeks BEFORE first real send)

**Files:** external tool + `docs/sales/outbound-runbook.md`.

- [ ] **Step 1: Subscribe to a warmup tool** (Smartlead, Warmup Inbox, or
  Mailwarm — pick one; ~AED 200–400/mo). Connect each practitioner mailbox on
  `outreach.underwings.org`.
- [ ] **Step 2: Start warmup at low volume**, ramping per the tool's schedule.
  Diarise the first-real-send date = warmup start + 21 days minimum.
- [ ] **Step 3: Verify reputation before any real send.**
  Run a domain check (e.g. mail-tester.com): **SpamAssassin score must be < 5**
  and the domain must appear on **zero** blocklists. If not → STOP (kill
  criterion); investigate before proceeding.

### Task H3: Apollo.io ICP saved searches

- [ ] **Step 1: Create the Apollo account** (~AED 1,200–1,800/mo tier with API
  export). Generate an API key.
- [ ] **Step 2: Build one saved search per practitioner ICP:**
  - Manoj: UAE healthcare CISO + UAE compliance director
  - Nelson: UAE SaaS CTO + UAE fintech security lead
  - Vinoth: UAE oil&gas IT director + UAE manufacturing IT manager
- [ ] **Step 3: Verify export shape.** Export 5 rows to CSV; confirm columns
  include `email`, `first_name`, `company`, `title`, `linkedin_url`. Task I4
  depends on these field names.

### Task H4: PhantomBuster LinkedIn integration

- [ ] **Step 1: Create PhantomBuster account** (~AED 600–900/mo); connect each
  practitioner's LinkedIn via the browser-cookie phantom.
- [ ] **Step 2: Test one connection-request + one message phantom** on a safe
  target. Confirm it runs without a LinkedIn security challenge.
- [ ] **Step 3: Record the per-practitioner phantom IDs** in the runbook (Task I5
  references them).

### Task H5: Content assets (outreach hooks)

- [ ] **Step 1: Confirm the 8 content pillars already published** (Phase D) cover
  the hooks; only NEW asset needed is gated PDFs of: ADHICS checklist, ISO 27001
  one-pager, web pen-test sample report, OWASP Top-10 explainer, Fortinet guide,
  zero-trust starter, UAE budget benchmark. Several already exist as blog posts —
  reuse, don't rewrite.
- [ ] **Step 2: Host each as a public PDF** under `frontend/public/` (same pattern
  as the Phase D one-pagers). Verify each loads at `underwings.org/<file>.pdf`.

### Task H6: Secrets + env

**Files:** `.env` (gitignored — never commit).

- [ ] **Step 1: Add the new keys to `.env`:**
  ```
  BREVO_API_KEY=xkeysib-...
  APOLLO_API_KEY=...
  OUTBOUND_FROM_DOMAIN=outreach.underwings.org
  OUTBOUND_DAILY_CAP=25
  ```
- [ ] **Step 2: Surface them to the sidecar + n8n** in `docker-compose.yml`
  `environment:` blocks (BREVO_API_KEY, OUTBOUND_* to `pandoc-render`;
  APOLLO_API_KEY to `n8n`). Recreate: `docker compose up -d pandoc-render n8n`.
- [ ] **Step 3: Verify** `docker compose exec -T pandoc-render sh -c 'echo ${BREVO_API_KEY:+set}'`
  prints `set`.

### Task H7: Slack channels

- [ ] **Step 1: Confirm existing channels** `#sales-pipeline`, `#new-leads`,
  `#hot-leads-manoj` (webhooks already in `.env`). Add `#hot-leads-nelson` +
  `#hot-leads-vinoth` webhooks → `.env` as `SLACK_HOT_LEADS_NELSON_WEBHOOK`,
  `SLACK_HOT_LEADS_VINOTH_WEBHOOK`. Verify each with a test post returns HTTP 200.

### Task H8: Write the runbook + Phase-H exit gate

- [ ] **Step 1: Write `docs/sales/outbound-runbook.md`** capturing every value
  above (domain, selectors, phantom IDs, first-send date, ICP search URLs).
- [ ] **Step 2: Exit criteria — ALL true before Phase I sends:** warmup ≥ 21 days
  done; mail-tester < 5; zero blocklists; Apollo export verified; one PhantomBuster
  test message sent cleanly; secrets set. If any fails, do not proceed.

---

# PART B — Phase I: Outbound automation (sidecar-first, TDD)

### Task I1: Test harness + suppression filter (pure function)

**Files:**
- Create: `pandoc-render/outbound.js`
- Create: `pandoc-render/test/outbound.test.js`

- [ ] **Step 1: Write the failing test**

```js
// pandoc-render/test/outbound.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { filterSuppressed } = require('../outbound');

test('filterSuppressed removes suppressed + already-known emails (case-insensitive)', () => {
  const candidates = [
    { email: 'New@Acme.com', company: 'Acme' },
    { email: 'sup@x.com',    company: 'X' },
    { email: 'known@y.com',  company: 'Y' },
  ];
  const suppressed = new Set(['sup@x.com']);
  const known      = new Set(['known@y.com']);
  const out = filterSuppressed(candidates, suppressed, known);
  assert.deepStrictEqual(out.map(c => c.email), ['New@Acme.com']);
});

test('filterSuppressed drops rows with no/invalid email', () => {
  const out = filterSuppressed(
    [{ email: '' }, { email: 'noatsign' }, { email: 'ok@z.com' }],
    new Set(), new Set());
  assert.deepStrictEqual(out.map(c => c.email), ['ok@z.com']);
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`
Expected: FAIL — `Cannot find module '../outbound'`.

- [ ] **Step 3: Minimal implementation**

```js
// pandoc-render/outbound.js
'use strict';

/** Lower-case, trim, and validate a single email. Returns '' if invalid. */
function normEmail(e) {
  const s = String(e || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : '';
}

/**
 * Keep only candidates with a valid email that is neither suppressed nor
 * already in the CRM. `suppressed` and `known` are Sets of lower-case emails.
 */
function filterSuppressed(candidates, suppressed, known) {
  return candidates.filter(c => {
    const e = normEmail(c.email);
    return e && !suppressed.has(e) && !known.has(e);
  });
}

module.exports = { normEmail, filterSuppressed };
```

- [ ] **Step 4: Run tests, verify pass**

Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`
Expected: PASS (2 tests).

- [ ] **Step 5: Make the container ship `outbound.js`.** The Dockerfile currently
  has `COPY package.json server.js ./` — `server.js` will `require('./outbound')`,
  so the container MUST include it or it crashes at boot. Edit `pandoc-render/Dockerfile`:

```dockerfile
COPY package.json server.js outbound.js ./
```

  Then rebuild + verify the sidecar still boots:
  Run: `docker compose build pandoc-render && docker compose up -d pandoc-render && sleep 3 && docker compose exec -T pandoc-render wget -qO- http://127.0.0.1:3000/health`
  Expected: the health JSON. (Tests run from the bind-mounted source during dev;
  this COPY is what makes the built image self-contained.)

- [ ] **Step 6: Commit**

```bash
git add pandoc-render/outbound.js pandoc-render/test/outbound.test.js pandoc-render/Dockerfile
git commit -m "feat(outbound): suppression+dedup filter with node:test harness"
```

### Task I2: Daily-cap enforcement (pure function)

**Files:** Modify `pandoc-render/outbound.js`, `pandoc-render/test/outbound.test.js`.

- [ ] **Step 1: Write the failing test**

```js
const { capRemaining } = require('../outbound');

test('capRemaining returns sends left for the mailbox today', () => {
  assert.strictEqual(capRemaining(25, 0), 25);
  assert.strictEqual(capRemaining(25, 20), 5);
  assert.strictEqual(capRemaining(25, 25), 0);
  assert.strictEqual(capRemaining(25, 30), 0); // never negative
});
```

- [ ] **Step 2: Run, verify fails** — `capRemaining is not a function`.
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 3: Implement** (append to `outbound.js`, add to exports)

```js
/** Sends still allowed today for one mailbox. Never negative. */
function capRemaining(dailyCap, sentToday) {
  return Math.max(0, Number(dailyCap) - Number(sentToday));
}
module.exports = { normEmail, filterSuppressed, capRemaining };
```

- [ ] **Step 4: Run, verify pass.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 5: Commit**

```bash
git add pandoc-render/outbound.js pandoc-render/test/outbound.test.js
git commit -m "feat(outbound): daily-cap helper"
```

### Task I3: Score-gate + draft-validation (pure functions)

**Files:** Modify `pandoc-render/outbound.js`, test file. Create `prompts/outbound-scoring.md`, `prompts/outbound-drafting.md`.

- [ ] **Step 1: Write the failing test**

```js
const { passesScoreGate, validateDraft } = require('../outbound');

test('passesScoreGate enforces confidence >= 60', () => {
  assert.strictEqual(passesScoreGate({ score: 60 }), true);
  assert.strictEqual(passesScoreGate({ score: 59 }), false);
  assert.strictEqual(passesScoreGate({ score: null }), false);
});

test('validateDraft requires subject, body, unsubscribe + DPO', () => {
  const good = { subject: 'Hi', body: 'Hello.\nUnsubscribe: x\ndpo@underwings.org' };
  assert.strictEqual(validateDraft(good).ok, true);
  assert.strictEqual(validateDraft({ subject: '', body: good.body }).ok, false);
  assert.strictEqual(validateDraft({ subject: 'Hi', body: 'no compliance footer' }).ok, false);
});
```

- [ ] **Step 2: Run, verify fails.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 3: Implement** (append + export)

```js
/** Hard score gate: skip leads Claude isn't >=60 confident on. */
function passesScoreGate(scored) {
  const n = Number(scored && scored.score);
  return Number.isFinite(n) && n >= 60;
}

/** A draft is sendable only if it has a subject, body, an unsubscribe and the DPO. */
function validateDraft(draft) {
  const subject = String(draft && draft.subject || '').trim();
  const body    = String(draft && draft.body || '');
  const hasUnsub = /unsubscribe/i.test(body);
  const hasDpo   = /dpo@underwings\.org/i.test(body);
  if (!subject) return { ok: false, reason: 'missing subject' };
  if (body.length < 20) return { ok: false, reason: 'body too short' };
  if (!hasUnsub || !hasDpo) return { ok: false, reason: 'missing unsubscribe/DPO footer' };
  return { ok: true };
}
module.exports = { normEmail, filterSuppressed, capRemaining, passesScoreGate, validateDraft };
```

- [ ] **Step 4: Run, verify pass.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 5: Write the Claude prompts.**

`prompts/outbound-scoring.md` (system): instruct Claude to score a single Apollo
lead 0–100 for ICP fit for the named practitioner, return STRICT JSON
`{"score": <int>, "reason": "<short>"}`. No prose.

`prompts/outbound-drafting.md` (system): instruct Claude to write a short,
specific cold email (≤ 120 words) + a 1-line LinkedIn DM for the lead +
practitioner, citing the relevant content asset, ALWAYS ending the email body
with `\n\nUnsubscribe: {{unsub_url}}\nData questions: dpo@underwings.org`. Return
STRICT JSON `{"subject": "...", "body": "...", "linkedin_dm": "..."}`.

- [ ] **Step 6: Commit**

```bash
git add pandoc-render/outbound.js pandoc-render/test/outbound.test.js prompts/outbound-scoring.md prompts/outbound-drafting.md
git commit -m "feat(outbound): score gate + draft validation + Claude prompts"
```

### Task I4: Draft review-queue table + `/outbound/harvest` endpoint

**Files:** Create `pandoc-render/migrations/001-outbound-draft.sql`; modify `pandoc-render/server.js`.

- [ ] **Step 1: Create the migration**

```sql
-- pandoc-render/migrations/001-outbound-draft.sql
CREATE TABLE IF NOT EXISTS uw_outbound_draft (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  lead_id      INT NULL,
  practitioner VARCHAR(50)  NOT NULL,
  channel      VARCHAR(50)  NOT NULL DEFAULT 'email',
  email        VARCHAR(255) NOT NULL,
  company      VARCHAR(255),
  score        INT,
  subject      VARCHAR(255),
  body         TEXT,
  linkedin_dm  TEXT,
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending_review', -- pending_review|approved|rejected|sent
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  TIMESTAMP NULL,
  UNIQUE KEY uq_email_day (email, created_at)
);
```

- [ ] **Step 2: Apply it.**
  Run: `docker compose exec -T krayin-db sh -c 'mariadb -ukrayin -pKrCrmUnderwings2026x krayin' < pandoc-render/migrations/001-outbound-draft.sql`
  Verify: `docker compose exec -T krayin-db mariadb -ukrayin -pKrCrmUnderwings2026x krayin -e "DESCRIBE uw_outbound_draft;"`

- [ ] **Step 3: Add `/outbound/harvest`** to `server.js`. Accepts
  `{ practitioner, source_id, leads: [{email,first_name,company,title,linkedin_url}] }`
  (n8n posts the Apollo export). Logic, in order:
  1. `requireToken(req,res)`.
  2. Load `suppressed` = `SELECT email FROM uw_outbound_suppression` and `known`
     = lower-cased emails already in `persons.emails` → Sets.
  3. `filterSuppressed(leads, suppressed, known)`.
  4. For each survivor: `callClaude([scoringPrompt], leadJson)` → parse → keep
     only `passesScoreGate`.
  5. For each kept: `callClaude([draftingPrompt], leadJson)` → parse → `validateDraft`.
  6. Insert valid drafts into `uw_outbound_draft` with `status='pending_review'`,
     and create a Krayin lead (pipeline 4, stage New=13, the practitioner's
     source id) linked back via `lead_id`.
  7. `logClaudeSpend` per call.
  8. Return `{ ok:true, harvested, scored_in, drafted, skipped_low_score }`, or
     `{ ok:false, step, reason }` on failure (mirror the `/proposal` shape at
     `server.js:524`).

- [ ] **Step 4: Smoke-test with a stub payload (dry, 2 fake leads).**
  Run:
  ```bash
  docker compose exec -T pandoc-render sh -c 'curl -s -X POST localhost:3000/outbound/harvest \
    -H "X-Shared-Token: $PANDOC_RENDER_TOKEN" -H "Content-Type: application/json" \
    -d "{\"practitioner\":\"manoj\",\"source_id\":17,\"leads\":[{\"email\":\"a@test.local\",\"first_name\":\"A\",\"company\":\"T\",\"title\":\"CISO\"}]}"'
  ```
  Expected: JSON `{ ok:true, ... }`; a row appears in `uw_outbound_draft`.

- [ ] **Step 5: Commit**

```bash
git add pandoc-render/migrations/001-outbound-draft.sql pandoc-render/server.js
git commit -m "feat(outbound): harvest endpoint + draft review queue"
```

### Task I5: `/outbound/send` endpoint (approved drafts → Brevo + log)

**Files:** Modify `pandoc-render/server.js`.

- [ ] **Step 1: Add a `sendBrevo({to, subject, html})` helper** in `server.js`,
  using the existing global `fetch`:

```js
async function sendBrevo({ to, name, subject, text }) {
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: { email: `outreach@${process.env.OUTBOUND_FROM_DOMAIN}`, name: 'Underwings' },
      to: [{ email: to, name }],
      subject,
      textContent: text,
    }),
  });
  if (!r.ok) { const b = await r.text(); throw new Error(`Brevo ${r.status}: ${b.slice(0,300)}`); }
  return r.json();
}
```

- [ ] **Step 2: Add `/outbound/send`.** Logic:
  1. `requireToken`.
  2. For each `practitioner`, compute `sentToday` =
     `SELECT COUNT(*) FROM uw_outbound_log WHERE practitioner=? AND channel='email' AND DATE(sent_at)=CURDATE()`,
     then `remaining = capRemaining(OUTBOUND_DAILY_CAP, sentToday)`.
  3. `SELECT * FROM uw_outbound_draft WHERE status='approved' AND practitioner=? AND channel='email' ORDER BY score DESC LIMIT remaining`.
  4. For each: `sendBrevo(...)`; on success insert into `uw_outbound_log`
     (lead_id, email, channel='email', sequence_step=1, practitioner, sent_at=NOW())
     and set the draft `status='sent'`.
  5. Return `{ ok:true, sent_per_practitioner: {...}, capped: bool }`.
  - LinkedIn DMs are NOT sent from here (PhantomBuster runs them; this endpoint
    only marks `channel='linkedin'` drafts for the phantom queue).

- [ ] **Step 3: Verify the cap holds.** With `OUTBOUND_DAILY_CAP=2` and 5 approved
  drafts, confirm only 2 send and the response shows `capped:true`. Reset cap to 25.

- [ ] **Step 4: Commit**

```bash
git add pandoc-render/server.js
git commit -m "feat(outbound): send endpoint with hard daily cap + Brevo + log"
```

### Task I6: Reply classifier (pure fn) + `/outbound/reply` endpoint

**Files:** Modify `outbound.js`, test file, `server.js`. Create `prompts/outbound-reply-classify.md`.

- [ ] **Step 1: Write the failing test**

```js
const { normalizeSentiment } = require('../outbound');

test('normalizeSentiment maps Claude labels to the 4 allowed values', () => {
  assert.strictEqual(normalizeSentiment('Interested'), 'interested');
  assert.strictEqual(normalizeSentiment('not now please'), 'not_now');
  assert.strictEqual(normalizeSentiment('NEVER contact me'), 'never');
  assert.strictEqual(normalizeSentiment('out of office'), 'ooo');
  assert.strictEqual(normalizeSentiment('garbage'), 'unknown');
});
```

- [ ] **Step 2: Run, verify fails.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 3: Implement** (append + export)

```js
function normalizeSentiment(raw) {
  const s = String(raw || '').toLowerCase();
  if (s.includes('never')) return 'never';
  if (s.includes('not now') || s.includes('later')) return 'not_now';
  if (s.includes('out of office') || s.includes('ooo')) return 'ooo';
  if (s.includes('interest')) return 'interested';
  return 'unknown';
}
module.exports = { normEmail, filterSuppressed, capRemaining, passesScoreGate, validateDraft, normalizeSentiment };
```

- [ ] **Step 4: Run, verify pass.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 5: Add `/outbound/reply`.** Accepts `{ from, subject, body }` from the
  n8n IMAP trigger. Logic:
  1. `requireToken`.
  2. `callClaude([replyPrompt], reply)` → `normalizeSentiment`.
  3. Update `uw_outbound_log` SET `reply_at=NOW(), reply_sentiment=?` WHERE
     `email=?` (most recent send).
  4. Act: `never` → insert into `uw_outbound_suppression (reason='reply: never')`;
     `interested` → move the Krayin lead to MQL (stage 14) and post to that
     practitioner's `#hot-leads-*` Slack webhook; `not_now`/`ooo` → note only.
  5. Return `{ ok:true, sentiment }`.

- [ ] **Step 6: Commit**

```bash
git add pandoc-render/outbound.js pandoc-render/test/outbound.test.js pandoc-render/server.js prompts/outbound-reply-classify.md
git commit -m "feat(outbound): reply classifier + reply endpoint with hot-lead routing"
```

### Task I7: Thin n8n workflows (15, 16, 17)

**Files:** Create `n8n/workflows/15-apollo-harvest.json`, `16-outbound-send.json`, `17-reply-detector.json`. Each follows the workflow-07 thin pattern: trigger → HTTP to sidecar (`X-Shared-Token: {{$env.PANDOC_RENDER_TOKEN}}`, `ignoreHttpStatusErrors:true`, `jsonBody: {{ JSON.stringify($json) }}`) → IF `String($json.ok)=='true'` (v2, `looseTypeValidation`) → Slack notify on both branches.

- [ ] **Step 1: `15-apollo-harvest`** — Schedule trigger `0 7 * * *` →
  HTTP GET Apollo export (per-practitioner saved search, `APOLLO_API_KEY`) →
  POST `/outbound/harvest` → IF ok → Slack `#sales-pipeline` summary / halt notice.
- [ ] **Step 2: `16-outbound-send`** — Schedule trigger `0 9 * * 1-5` (weekdays
  09:00) → POST `/outbound/send` → IF ok → Slack `#sales-pipeline`
  "`{sent}` sent today (capped: `{capped}`)".
- [ ] **Step 3: `17-reply-detector`** — n8n **IMAP Email** trigger on the
  `outreach@outreach.underwings.org` mailbox → POST `/outbound/reply` with
  `{from, subject, body}` → IF `interested` → no-op (sidecar already pinged
  `#hot-leads`); else end.
- [ ] **Step 4: Import + activate each.**
  Run per file: `docker compose exec -T n8n n8n import:workflow --input=/dev/stdin < n8n/workflows/15-apollo-harvest.json`
  then `n8n update:workflow --id=<id> --active=true` and `docker compose restart n8n`.
  Verify: `docker compose exec -T n8n n8n list:workflow --active=true | grep -E '15|16|17'`.
- [ ] **Step 5: Approval mechanism.** Drafts are reviewed by flipping
  `uw_outbound_draft.status` to `approved`. Provide review via either (a) a Krayin
  custom view, or (b) a tiny n8n **form** workflow `18-draft-approve` that lists
  `pending_review` drafts and sets the chosen IDs to `approved`. For the first 90
  days this human step is MANDATORY (Guardrail 4).
- [ ] **Step 6: Commit**

```bash
git add n8n/workflows/15-apollo-harvest.json n8n/workflows/16-outbound-send.json n8n/workflows/17-reply-detector.json
git commit -m "feat(outbound): thin n8n trigger workflows 15/16/17"
```

### Task I8: KPI instrumentation (Metabase)

**Files:** none in repo (Metabase via API, like Phase B).

- [ ] **Step 1: Add warehouse coverage.** Ensure the nightly ETL (workflow 13)
  also lands `uw_outbound_log` + `uw_outbound_draft` into `raw.*` (add two
  copy steps mirroring the existing leads path). Verify rows appear in
  `warehouse.raw.uw_outbound_log`.
- [ ] **Step 2: Create Metabase cards** for the Phase I KPIs (master plan §7-I):
  reply rate (`reply_at` / sends), interested rate, MQL conversion from outbound,
  sends/day/practitioner vs the cap. Add to a new "Outbound" dashboard.
- [ ] **Step 3: Verify** each card renders with live (even if zero) data.

---

## Wiring summary (what runs when)

| Trigger | Calls | Cadence |
|---|---|---|
| n8n `15-apollo-harvest` | `/outbound/harvest` | daily 07:00 |
| human review (`18-draft-approve` / Krayin view) | sets `status='approved'` | daily, manual |
| n8n `16-outbound-send` | `/outbound/send` | weekdays 09:00, ≤25/mailbox |
| n8n `17-reply-detector` | `/outbound/reply` | on inbound mail |
| `node --test` | `pandoc-render/test/` | every build / CI |

---

## Self-Review (completed against master-plan §7-H/I)

**Spec coverage:** H1 subdomain+SPF/DKIM/DMARC ✓ · H2 warmup ✓ · H3 Apollo ICP ✓
· H4 PhantomBuster ✓ · H5 content assets ✓ · H6 suppression list (reused, exists)
✓ · H7 Slack channels ✓. I1 apollo-daily-harvest ✓ (Task I4+I7) · I2
claude-scoring-and-drafting ✓ (I3+I4) · I3 review/approval watcher ✓ (I7 step 5)
· I4 outbound-reply-detector ✓ (I6+I7). Critical rules: ≤25/day ✓ (I2+I5),
human-in-loop ✓ (I7-5), skip <60 ✓ (I3), DPO+unsubscribe ✓ (I3+I5).

**Type consistency:** function names used identically across tasks —
`filterSuppressed`, `capRemaining`, `passesScoreGate`, `validateDraft`,
`normalizeSentiment`, `normEmail`, `sendBrevo`. Draft status vocabulary fixed:
`pending_review|approved|rejected|sent`. Sentiment vocabulary fixed:
`interested|not_now|never|ooo|unknown`.

**Placeholder scan:** prompts are described by their exact JSON contract; no
"TODO"/"add error handling" — endpoints reuse the documented `/proposal`
ok/err shape at `server.js:524`.

**Known dependency on Phase H:** Tasks I4/I5 require `BREVO_API_KEY`,
`APOLLO_API_KEY`, `OUTBOUND_FROM_DOMAIN`, `OUTBOUND_DAILY_CAP` (Task H6) and the
warmed domain (H1/H2). Do not run I5 sends until the H8 exit gate passes.
