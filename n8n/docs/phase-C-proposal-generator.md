# Phase C — Proposal Generator

> **Status:** Code shipped 2026-05-21. Awaits Documenso deployment + n8n credential wiring before activation.
> **Plan reference:** `UNDERWINGS-MASTER-PLAN.md` §7/C
> **Spec reference:** `docs/superpowers/specs/2026-05-21-phase-c-proposal-generator.md`

## What was built

### Content layer
- **`templates/skus.yml`** — single source of truth for 11 SKUs: pen-test
  (web/network-external/network-internal/mobile/phishing), GRC (ISO 27001 /
  ADHICS / PDPL), subscriptions (PTaaS / Continuous Compliance), software
  resale. Includes price ranges, defaults, owners, lead times, pipeline
  mapping.
- **`templates/proposals/`** — 8 SKU-specific proposal markdown templates
  + `_shared-footer.md` (org info, payment terms, validity, acceptance
  flow — included verbatim at the end of every proposal).
- **`prompts/proposal-generation.md`** — Claude system prompt + user-message
  shape + JSON output schema + 5 test cases for the dry-run validation.
  Uses prompt caching on system + SKU table + template; expected
  per-call cost AED 0.5–1 post-warm-cache vs. AED 8 budget target.

### Logic layer
- **`scripts/render-proposal.js`** — Node script that:
  - Substitutes `{{ var }}`, `{{#each}}`, and `{{> _shared-footer }}` markers
  - Generates stable proposal reference `UW-<lead_id>-<YYYYMMDD>-<seq>`
  - Renders markdown → PDF via pandoc (xelatex)
  - Writes both to `/data/proposals/<ref>/`
  - Emits JSON path payload for n8n
- **`n8n/workflows/07-proposal-generator.json`** — internal-form-triggered
  workflow:
  1. Form submission (lead_id, sku, scope_notes)
  2. Validate scope notes length (≥ 100 chars)
  3. Fetch lead from Krayin
  4. Load template + SKU + prompt from disk
  5. Claude API call (Sonnet 4.6, ephemeral cache)
  6. Parse + validate (JSON shape, sum match, price-range)
  7. Render md + PDF
  8. Documenso: create envelope, send signature request
  9. Krayin: stage → Proposal Sent (18)
  10. Log Claude cost to `ops.claude_api_calls` (warehouse)
  11. Slack `#sales-pipeline` announce
- **`n8n/workflows/08-onboarding-kickoff.json`** — Documenso signature
  webhook receiver:
  1. HMAC-verify signature against `DOCUMENSO_WEBHOOK_SECRET`
  2. Fetch lead context from warehouse
  3. Branch: `ONBOARDING_AUTO_APPROVE=true` → straight through; otherwise →
     Slack human approval gate (default — first 10 deals)
  4. Krayin: stage → Won (20)
  5. Plane: create delivery project from SKU template name
  6. Brevo: kickoff email to client
  7. Slack `#client-success` announce

### Operational layer
- **`runbooks/documenso-deployment.md`** — 30-min Documenso self-hosted
  deployment: docker-compose service blocks, secrets generation, nginx
  routing, Cloudflare Tunnel hostname + Access policy (with Bypass rule
  for webhook endpoint), first-run setup, API token + webhook secret
  configuration.

## What's NOT yet deployed (intentional)

| Item | Why deferred | Unblock by |
|---|---|---|
| Documenso container running | Disk currently at 80%; want founder to confirm before adding two more containers | Founder approval + `runbooks/documenso-deployment.md` |
| n8n credentials `Krayin MariaDB (read-only)`, `Warehouse Postgres` | Shared with Phase B; founder still needs to create them in n8n UI | Phase B Step 3 (5 min in n8n UI) |
| `ANTHROPIC_API_KEY` available to n8n env | Existing workflows 02 + 05 already use it; should already be set | Verify on n8n container env |
| `pandoc + xelatex` installed in n8n container | Image is `n8nio/n8n:latest` — doesn't include LaTeX | Add to n8n's Dockerfile or use a render sidecar |
| Workflow 07 + 08 imported into n8n | JSON files committed but not yet imported | n8n UI: Workflows → Import from File |
| `SLACK_SALES_WEBHOOK`, `SLACK_CS_WEBHOOK` env vars | Pending Slack workspace creation (master plan §13) | Founder creates workspace |

## Pandoc dependency — three options

The render script needs pandoc + xelatex inside the container that runs
`Execute Command`. Choose one:

**Option A — Extend the n8n image** (recommended for v1)
Add to a `n8n/Dockerfile` overlay:
```dockerfile
FROM n8nio/n8n:latest
USER root
RUN apk add --no-cache pandoc texlive texlive-xetex font-noto
USER node
```
Adds ~600 MB to the image. Done once.

**Option B — Dedicated render sidecar**
A small `render-service` container with pandoc; n8n shells out via HTTP
instead of `Execute Command`. More moving parts; cleaner separation.

**Option C — Headless Chromium** (resurrect the old scope-builder approach)
Render markdown via marked → HTML → puppeteer-print. We deleted that
container in the scope-builder rip-out; could re-add for internal use only.
Heavier than pandoc but already battle-tested in our codebase.

**Recommendation:** Option A. Smallest change, smallest delta to the stack.

## Acceptance criteria (spec §9)

- [x] All 9 SKU templates committed (8 unique + 1 shared footer)
- [x] `templates/skus.yml` committed
- [x] Claude prompt + test cases in `prompts/proposal-generation.md`
- [x] n8n workflows 07 + 08 authored
- [x] Render script authored + syntax-checked
- [x] Documenso runbook authored
- [ ] Documenso running at `sign.underwings.org`
- [ ] Pandoc/xelatex installed in n8n container
- [ ] Workflows 07 + 08 imported + creds wired in n8n UI
- [ ] First real `[TEST]` lead pushed through end-to-end
- [ ] First real client signed proposal

Phase C is "shipped" when the bottom 5 are checked.

## Time to first signed proposal

| Step | Effort | Owner |
|---|---|---|
| Documenso deploy (runbook) | 30 min | claude-code (compose) + founder (browser) |
| Pandoc in n8n image | 15 min | claude-code |
| Import workflows + wire creds in n8n UI | 10 min | founder |
| Smoke test with `[TEST]` lead | 15 min | founder |
| First real proposal | as needed | founder fills the form post-call |

**Total to first proposal: ~70 min of human time** spread across whoever's available.

## Open questions deferred from spec §10

1. **Documenso vs DocuSign:** Documenso chosen.
2. **PDF rendering: pandoc vs puppeteer:** pandoc chosen (lighter, runbook reflects this). Fallback to puppeteer if formatting fails on the first 3 dry runs.
3. **`skus.yml` location:** `templates/skus.yml` — done.
4. **Auto-Won on signature vs human:** Human approval gate, controlled by `ONBOARDING_AUTO_APPROVE` env var. Flip to `true` after 10 successful deals.
5. **Invoice 30% workflow:** Out of scope for Phase C. Tracked as master-plan §13 open question 6.

## Risk register status (spec §6)

| Risk | Mitigation in code | Status |
|---|---|---|
| Claude generates wrong AED total | n8n function node validates sum == total | ✅ |
| Documenso webhook drops / arrives twice | HMAC verification + (idempotency to be added when first duplicate observed) | 🟡 partial |
| pandoc rendering breaks | n8n shell exit code propagates; Slack alert; markdown attached as fallback | ✅ |
| Client edits AED in head and signs | Documenso audit trail; PDF is the signed artefact | ✅ structural |
| SKU prices drift website ↔ yml | Phase D follow-up: website reads `skus.yml` at build time | ❌ deferred |
| Scope notes too vague → Claude hallucinates | Min-length check + `needs_more_info` branch | ✅ |
| Templates rot over time | Phase K monthly review picks 1 template to re-validate | ❌ deferred (process, not code) |
