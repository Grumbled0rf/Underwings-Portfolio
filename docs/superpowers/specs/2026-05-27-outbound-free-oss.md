# Outbound (Free / OSS variant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status:** SHOVEL-READY, GATED. Sibling to `2026-05-27-phase-h-i-outbound.md`
> (the paid-tool version). This variant achieves the same outcome with **~AED 0/mo**
> recurring cost by swapping Apollo/PhantomBuster/warmup-SaaS for free sources +
> human-sent LinkedIn. Written 2026-05-27. Same gates apply (first paying client +
> inbound not saturated).

**Goal:** Automatic outbound that reaches the target audience using only free /
open-source data sources and the infra we already run — lead discovery → enrich →
Claude score → draft → human approve → send (email auto, LinkedIn human) → classify
replies — at zero recurring tooling cost.

**Architecture:** Sidecar-first (extends `pandoc-render`), identical to the paid
spec. The ONLY differences are: (1) a new `/outbound/discover` endpoint that pulls
candidates from free sources instead of Apollo, (2) email discovery via pattern +
MX verify (with optional free-tier Hunter/Apollo enrichment for top candidates),
(3) LinkedIn is a **human-send queue**, never automated. Everything downstream —
the score gate, draft validation, send, reply classifier, daily cap, draft review
table — is **reused verbatim from the paid spec**.

**Tech Stack:** Node 20 `node:test` (built-in), Express, mysql2, pg (already in the
sidecar), **cheerio** (new dep, for scraping), free DNS MX lookup (`node:dns`),
OpenStreetMap Overpass API (no key), Google Programmable Search JSON API (free
100/day), Hunter.io free tier (optional enrich), Anthropic Claude (`callClaude`,
already wired), Stalwart or Brevo-free for sending.

---

## Guardrails (NON-NEGOTIABLE)

Same as the paid spec, PLUS two specific to this variant:

1. **Gate 1 — first paying client signed.** 2. **Gate 2 — inbound not saturating.**
3. **≤ 25 sends/day/mailbox** (enforced in code). 4. **Human-in-the-loop on every
first touch for 90 days.** 5. **Skip Claude confidence < 60.** 6. **DPO contact +
unsubscribe in every email.** 7. **Dedicated sending subdomain; SpamAssassin > 5 or
any blocklist hit = pause.**
8. **LinkedIn is NEVER automated.** No cookie injection, no headless bot. The system
   only *drafts + queues*; a human sends. This protects the account from bans and is
   consistent with our own PDPL/ethics positioning.
9. **Free-data hygiene.** We process only business-context data, honour suppression
   + erasure (the suppression table already does this), and never resell or retain
   scraped personal data beyond the retention policy. Add every discovered lead under
   PDPL legitimate-interest (B2B) with the unsubscribe + DPO footer.

---

## Reused VERBATIM from the paid spec (do NOT re-design — build per that doc)

`2026-05-27-phase-h-i-outbound.md` already specifies these; build them identically:

- **Pure functions** in `pandoc-render/outbound.js`: `normEmail`, `filterSuppressed`,
  `capRemaining`, `passesScoreGate`, `validateDraft`, `normalizeSentiment`
  (paid-spec Tasks I1–I3, I6) + their `node:test` suite.
- **`uw_outbound_draft`** review-queue table (paid-spec Task I4 migration).
- **`/outbound/harvest`** (score → draft → queue → create Krayin lead) — paid-spec
  Task I4. This variant feeds it candidates from `/outbound/discover` instead of Apollo.
- **`/outbound/send`** (approved email drafts → Brevo/Stalwart + `uw_outbound_log`,
  daily cap) — paid-spec Task I5.
- **`/outbound/reply`** (IMAP → Claude classify → route) — paid-spec Task I6.
- **Claude prompts** `outbound-scoring.md`, `outbound-drafting.md`,
  `outbound-reply-classify.md` — paid-spec Tasks I3/I6.
- **Thin n8n pattern** (trigger → HTTP → IF `String($json.ok)=='true'` → Slack).

This variant adds ONLY the free discovery + email-finding + LinkedIn-queue pieces below.

---

## Free lead-data accounts to create (optional enrichment, free tiers)

Create 2–3; use their scarce credits ONLY on top-scored candidates:

- **Hunter.io (free)** ⭐ — 25 domain-searches + 50 verifications/mo. `HUNTER_API_KEY`.
- **Apollo.io (free plan)** — limited contact credits. `APOLLO_API_KEY` (optional).
- **People Data Labs (free)** — enrichment credits. `PDL_API_KEY` (optional).

The free *sources* (OSM, scraper, Google search, hiring signals) carry the volume;
these APIs are a quality top-up, not the backbone.

---

## File Structure

- Create: `pandoc-render/lead-sources.js` — pure builders/parsers for each free
  source (no network): Overpass QL builder, scraper email-extractor, search-result
  domain picker, hiring-signal parser, email-pattern generator.
- Create: `pandoc-render/test/lead-sources.test.js` — `node:test` suite.
- Modify: `pandoc-render/server.js` — add `/outbound/discover` (runs the sources +
  enrich) and `/outbound/linkedin-queue` (human-send digest).
- Modify: `pandoc-render/package.json` — add `cheerio`. Modify
  `pandoc-render/Dockerfile` — `COPY` the new files + rebuild installs cheerio.
- Create: `n8n/workflows/15-discover-harvest.json`, `16-outbound-send.json`,
  `17-reply-detector.json`, `18-linkedin-queue.json`.
- Create: `docs/sales/outbound-free-runbook.md` — the human runbook.

---

# PART A — Phase H-free: Prerequisites (~1 week, AED 0)

### Task H1: Dedicated sending subdomain + SPF/DKIM/DMARC

Identical to paid-spec Task H1 (`outreach.underwings.org` in Stalwart + Cloudflare
DNS). Build per that doc. Verify with `dig` + a Gmail "show original" SPF/DKIM/DMARC=PASS.

### Task H2: Manual warmup (free, slow ramp)

- [ ] **Step 1:** No paid warmup tool. Instead, for the first 3 weeks send only a
  handful of real, personal emails/day from `outreach@` to engaged contacts (and
  have a few colleagues reply), ramping gradually. The `OUTBOUND_DAILY_CAP=25` keeps
  volume low permanently.
- [ ] **Step 2: Verify before bulk:** mail-tester.com score **< 5** and **zero**
  blocklists (mxtoolbox.com/blacklists). If not → STOP (kill criterion).

### Task H3: Free API keys + Google Programmable Search engine

- [ ] **Step 1:** Create **Hunter.io** free account → `HUNTER_API_KEY`. (Optional:
  Apollo free → `APOLLO_API_KEY`; PDL free → `PDL_API_KEY`.)
- [ ] **Step 2:** Create a **Google Programmable Search Engine** (free): get the
  engine ID `cx` and a Custom Search JSON API key (`GOOGLE_CSE_KEY`, `GOOGLE_CSE_CX`).
  Free quota = 100 queries/day.
- [ ] **Step 3: Add to `.env`** (gitignored) and surface to the sidecar in
  `docker-compose.yml`:
  ```
  HUNTER_API_KEY=...
  GOOGLE_CSE_KEY=...
  GOOGLE_CSE_CX=...
  OUTBOUND_FROM_DOMAIN=outreach.underwings.org
  OUTBOUND_DAILY_CAP=25
  # BREVO_API_KEY=...   # only if sending via Brevo-free instead of Stalwart
  ```
- [ ] **Step 4: Verify** `docker compose exec -T pandoc-render sh -c 'echo ${HUNTER_API_KEY:+set} ${GOOGLE_CSE_KEY:+set}'` prints `set set`.

---

# PART B — Phase I-free: Free discovery + automation (TDD)

### Task I-F1: Add cheerio + new-file plumbing

**Files:** Modify `pandoc-render/package.json`, `pandoc-render/Dockerfile`.

- [ ] **Step 1:** Add cheerio to `package.json` dependencies:
  ```json
  "cheerio": "^1.0.0"
  ```
- [ ] **Step 2:** Update the Dockerfile COPY so the image ships the new modules
  (else `require` crashes at boot):
  ```dockerfile
  COPY package.json server.js outbound.js lead-sources.js ./
  ```
- [ ] **Step 3:** Rebuild + boot-check.
  Run: `docker compose build pandoc-render && docker compose up -d pandoc-render && sleep 3 && docker compose exec -T pandoc-render wget -qO- http://127.0.0.1:3000/health`
  Expected: health JSON. Commit.

### Task I-F2: Overpass QL builder + search-domain picker (pure)

**Files:** Create `pandoc-render/lead-sources.js`, `pandoc-render/test/lead-sources.test.js`.

- [ ] **Step 1: Write the failing test**

```js
// pandoc-render/test/lead-sources.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildOverpassQL, pickDomains } = require('../lead-sources');

test('buildOverpassQL targets a category within a country area', () => {
  const ql = buildOverpassQL('hospital', 'AE');
  assert.match(ql, /\[out:json\]/);
  assert.match(ql, /ISO3166-1"="AE"/);
  assert.match(ql, /"amenity"="hospital"/);
  assert.match(ql, /out tags center/);
});

test('pickDomains extracts unique hostnames from search items', () => {
  const items = [
    { link: 'https://acme.ae/contact' },
    { link: 'https://acme.ae/about' },
    { link: 'http://beta.example.com/x' },
  ];
  assert.deepStrictEqual(pickDomains(items), ['acme.ae', 'beta.example.com']);
});
```

- [ ] **Step 2: Run, verify fails** (`Cannot find module '../lead-sources'`).
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 3: Implement**

```js
// pandoc-render/lead-sources.js
'use strict';

/** Overpass QL: businesses of `category` inside a country's admin area. */
function buildOverpassQL(category, iso = 'AE', limit = 200) {
  return `[out:json][timeout:60];
area["ISO3166-1"="${iso}"][admin_level=2]->.c;
(node["amenity"="${category}"](area.c);
 way["amenity"="${category}"](area.c);
 node["office"="${category}"](area.c);
 way["office"="${category}"](area.c););
out tags center ${limit};`;
}

/** Unique hostnames from Google CSE result items. */
function pickDomains(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    try {
      const h = new URL(it.link).hostname.replace(/^www\./, '');
      if (!seen.has(h)) { seen.add(h); out.push(h); }
    } catch { /* skip bad URL */ }
  }
  return out;
}

module.exports = { buildOverpassQL, pickDomains };
```

- [ ] **Step 4: Run, verify pass.** Commit.

### Task I-F3: Email extractor + pattern generator (pure)

**Files:** Modify `lead-sources.js`, test file.

- [ ] **Step 1: Write the failing test**

```js
const { extractEmails, guessEmails } = require('../lead-sources');

test('extractEmails finds mailto + inline addresses, dedup + lowercased', () => {
  const html = `<a href="mailto:Info@Acme.ae">mail</a> ceo@acme.ae also info@acme.ae`;
  assert.deepStrictEqual(extractEmails(html).sort(), ['ceo@acme.ae', 'info@acme.ae']);
});

test('guessEmails builds common B2B patterns for a domain', () => {
  const out = guessEmails('Jane', 'Doe', 'acme.ae');
  assert.ok(out.includes('jane.doe@acme.ae'));
  assert.ok(out.includes('jdoe@acme.ae'));
  assert.ok(out.includes('jane@acme.ae'));
});
```

- [ ] **Step 2: Run, verify fails.**
  Run: `docker compose exec -T pandoc-render sh -c 'cd /app && node --test test/'`

- [ ] **Step 3: Implement** (append + export)

```js
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** All emails in a page (mailto + inline), lower-cased + unique. */
function extractEmails(html) {
  const found = (String(html || '').match(EMAIL_RE) || []).map(e => e.toLowerCase());
  // drop obvious asset noise (e.g. sentry, wordpress example)
  const clean = found.filter(e => !/\.(png|jpg|gif|webp)$/.test(e) && !e.endsWith('example.com'));
  return [...new Set(clean)];
}

/** Common B2B email patterns for a person at a domain. */
function guessEmails(first, last, domain) {
  const f = String(first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = String(last || '').toLowerCase().replace(/[^a-z]/g, '');
  const d = String(domain || '').toLowerCase().replace(/^www\./, '');
  if (!d) return [];
  const out = new Set();
  if (f && l) { out.add(`${f}.${l}@${d}`); out.add(`${f[0]}${l}@${d}`); out.add(`${f}${l}@${d}`); out.add(`${f}_${l}@${d}`); }
  if (f) out.add(`${f}@${d}`);
  return [...out];
}

module.exports = { buildOverpassQL, pickDomains, extractEmails, guessEmails };
```

- [ ] **Step 4: Run, verify pass.** Commit.

### Task I-F4: `/outbound/discover` endpoint (free sources → candidates)

**Files:** Modify `pandoc-render/server.js`.

- [ ] **Step 1: Add a `verifyMx(email)` helper** (free, DNS-only — no risky SMTP probe):

```js
const dns = require('node:dns').promises;
async function verifyMx(email) {
  const domain = String(email).split('@')[1];
  if (!domain) return false;
  try { const mx = await dns.resolveMx(domain); return mx && mx.length > 0; }
  catch { return false; }
}
```

- [ ] **Step 2: Add `/outbound/discover`.** Accepts
  `{ practitioner, source_id, mode, query }` where `mode` ∈
  `osm|search|scrape|jobs`. Logic per mode:
  - **osm:** POST `buildOverpassQL(query.category, 'AE')` to
    `https://overpass-api.de/api/interpreter`; map elements → candidates
    `{ company: tags.name, website: tags.website, email: tags.email||'' }`.
  - **search:** GET Google CSE
    (`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CSE_KEY}&cx=${GOOGLE_CSE_CX}&q=${query}`);
    `pickDomains(items)` → candidates `{ company: domain, website: 'https://'+domain }`.
  - **scrape:** for each candidate website, fetch + `extractEmails(html)` from `/`,
    `/contact`, `/about` (cheerio optional for names); attach the best generic email.
  - **jobs:** fetch a public UAE job-search URL for "information security"; cheerio
    out hiring company names → candidates (buying-signal, lower volume).
  Then **enrich the top candidates only** (those with a website but no email): if
  `HUNTER_API_KEY` set, call Hunter `domain-search` (respect the free monthly cap —
  track usage in `ops.api_usage`) to get a named email; else `guessEmails(...)` +
  `verifyMx(...)`, keep the first that passes MX.
  Emit `{ ok:true, candidates:[{email,first_name,company,title,linkedin_url,website}], counts:{...} }`.
- [ ] **Step 3: Smoke-test OSM mode** (no key needed):
  ```bash
  docker compose exec -T pandoc-render sh -c 'curl -s -X POST localhost:3000/outbound/discover \
    -H "X-Shared-Token: $PANDOC_RENDER_TOKEN" -H "Content-Type: application/json" \
    -d "{\"practitioner\":\"manoj\",\"source_id\":17,\"mode\":\"osm\",\"query\":{\"category\":\"hospital\"}}"' | head -c 400
  ```
  Expected: `{ ok:true, candidates:[...], ... }` with real UAE hospital rows. Commit.

### Task I-F5: Wire discovery → existing `/outbound/harvest`

- [ ] **Step 1:** The n8n discovery workflow posts the `candidates` array straight
  into the **existing** `/outbound/harvest` (paid-spec Task I4), which does the
  Claude score gate, draft validation, draft-queue insert, and Krayin lead creation.
  No new code — just the n8n wiring (Task I-F7). Verify a discovered candidate ends
  up as a `pending_review` row in `uw_outbound_draft`.

### Task I-F6: LinkedIn human-send queue `/outbound/linkedin-queue`

**Files:** Modify `pandoc-render/server.js`.

- [ ] **Step 1: Add `/outbound/linkedin-queue`.** Selects
  `SELECT id, company, linkedin_dm, /* profile */ ... FROM uw_outbound_draft
   WHERE status='approved' AND channel='linkedin'` and posts a **digest** to the
  practitioner's `#hot-leads-<name>` Slack webhook: for each row, the LinkedIn
  profile URL + the drafted DM + the draft id. Humans send manually, then mark sent.
- [ ] **Step 2: "Mark sent" path.** Reuse the `18-draft-approve` form pattern (paid
  spec Task I7 step 5): a tiny n8n form where the human pastes the ids they sent →
  sets `status='sent'` + inserts `uw_outbound_log (channel='linkedin', practitioner, sent_at)`.
  NO automated LinkedIn sending anywhere (Guardrail 8).
- [ ] **Step 3: Verify** the digest posts to the right channel with copy-pasteable
  DMs. Commit.

### Task I-F7: Thin n8n workflows

**Files:** Create `15-discover-harvest.json`, `16-outbound-send.json`,
`17-reply-detector.json`, `18-linkedin-queue.json`. Thin pattern throughout.

- [ ] **Step 1: `15-discover-harvest`** — Schedule `0 7 * * *` → (per practitioner)
  POST `/outbound/discover` → POST `/outbound/harvest` with the returned candidates →
  IF ok → Slack `#sales-pipeline` summary.
- [ ] **Step 2: `16-outbound-send`** — Schedule `0 9 * * 1-5` → POST `/outbound/send`
  (email only) → IF ok → Slack `#sales-pipeline` "`{sent}` sent (capped `{capped}`)".
- [ ] **Step 3: `17-reply-detector`** — n8n IMAP trigger on `outreach@` mailbox →
  POST `/outbound/reply` → end (sidecar routes hot leads).
- [ ] **Step 4: `18-linkedin-queue`** — Schedule `0 9 * * 1-5` → POST
  `/outbound/linkedin-queue` → end.
- [ ] **Step 5: Import + activate each**, restart n8n, confirm active
  (`n8n list:workflow --active=true | grep -E '15|16|17|18'`). Commit.

### Task I-F8: KPI instrumentation (Metabase)

- [ ] **Step 1:** Extend the nightly ETL (workflow 13) to land `uw_outbound_log` +
  `uw_outbound_draft` into `raw.*` (mirror the leads path).
- [ ] **Step 2:** Metabase "Outbound (free)" dashboard: leads discovered/day by
  source + mode, email reply rate, LinkedIn-sent count, interested rate, MQL
  conversion, sends vs cap. Verify each card renders.

---

## Cost + throughput reality (be honest with the founder)

- **Recurring cost: ~AED 0.** Only Claude API calls (pennies/lead) + your time.
- **Free source quality is messier** than Apollo → the Claude score gate (≥60) and
  MX verify do the cleanup; expect to discard a large fraction. That's fine.
- **Hunter free cap is small** (25/mo) → spend it only on the best-scored, website-but-
  no-email candidates; everything else uses `guessEmails` + MX.
- **Self-warmup is slower/riskier** than a paid tool → keep volume genuinely low,
  watch the kill-criterion (mail-tester < 5).
- **LinkedIn throughput is bounded by your hands** (human-send) → that's the price of
  not risking a ban; it also keeps quality high for the first 90 days anyway.

---

## Self-Review

**Spec coverage:** multiple free sources (OSM ✓, Google CSE ✓, website scrape ✓,
hiring signals ✓), LinkedIn study + human-send (✓ Task I-F6, never automated),
Claude scoring (✓ reused gate), continue-previous-plan (✓ reuses harvest/send/reply/
draft-queue from the paid spec), free email finding (✓ guess + MX + optional Hunter).

**Placeholder scan:** all new pure functions have complete code + tests; endpoints
specify exact inputs/outputs and reuse the documented `/proposal` ok/err shape.

**Type consistency:** candidate shape `{email,first_name,company,title,linkedin_url,
website}` is produced by `/outbound/discover` and consumed by the existing
`/outbound/harvest`. New pure fns: `buildOverpassQL`, `pickDomains`, `extractEmails`,
`guessEmails`, `verifyMx` — names used identically across tasks. Draft `channel` ∈
`email|linkedin`; status vocab `pending_review|approved|rejected|sent` (matches paid spec).

**Dependency note:** Task I-F4 needs `GOOGLE_CSE_*`/`HUNTER_API_KEY` (Task H3) for
search/enrich modes; OSM mode needs nothing. Do not run `16-outbound-send` until the
H2 warmup exit gate passes.
