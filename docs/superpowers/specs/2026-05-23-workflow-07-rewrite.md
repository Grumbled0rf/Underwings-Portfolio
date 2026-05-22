# Phase C — Workflow 07 rewrite (sidecar-first architecture)

> **Status:** Planned for 2026-05-23 morning. Today's debug log proved
> the current per-node n8n approach is too fragile across n8n version
> quirks. Rewrite collapses ~16 nodes → ~5 by moving logic into the
> pandoc-render sidecar.
> **Trigger:** founder said "ok we will do rewrite tomorrow morning"
> on 2026-05-22 evening after ~10 round-trip n8n quirks in one
> debugging session.

---

## What's broken in the current design

`07-proposal-generator.json` has 16+ nodes doing per-step orchestration
inside n8n. Each node hit a different n8n 2.20.7 quirk this evening:

| # | Issue | Fix needed |
|---|---|---|
| 1 | MySQL `queryReplacement` strict CSV format | Switch to inline expression `={{ String($json.x) }}` |
| 2 | MySQL `?` placeholder not substituted | Inline value directly |
| 3 | `is_default` int → bool cast | Wrap in ternary |
| 4 | `null` rendered as string `"null"` in templates | `|| ''` coalesce |
| 5 | `$$ ... $$` dollar-quote collapsed inside `{{...}}` | Keep `$$` outside expressions |
| 6 | IF v2 boolean vs string strictness | `String()` wrap + `looseTypeValidation` |
| 7 | Krayin schema: `leads.organization_id` doesn't exist | JOIN via `persons.organization_id` |
| 8 | `fs` not in `NODE_FUNCTION_ALLOW_BUILTIN` | Add to env |
| 9 | `js-yaml` not in n8n container | Ship `skus.json` instead |
| 10 | `$('node name')` cross-ref fails through IF branches | Insert Merge node |

After 10 fixes, the next likely failures are the Claude API call and the
Documenso envelope create. Each will be another version-specific quirk
to chase. Diminishing returns.

## Why a rewrite, not more fixes

Every n8n node we add is a new surface for version-specific quirks. The
current design is "n8n orchestrates everything"; the next n8n upgrade
might break any of the 10 patches above. Brittle.

The pandoc-render sidecar is a regular Node app: no template engine
quirks, no IF-node weirdness, no per-node type strictness. Moving the
orchestration there reduces n8n's job to "trigger + announce" and
makes the system robust to n8n upgrades.

## Target architecture

```
[n8n form trigger]
       |
       v
[n8n HTTP Request -> pandoc-render:3000/proposal]
       |
       v
[n8n IF: success?]
   /          \
 [Slack:     [Slack:
  announce]   halt notice]
```

**5 n8n nodes total.** All the heavy lifting in the sidecar.

## What the sidecar does in `/proposal`

New endpoint `POST /proposal` on pandoc-render. Accepts:
```json
{
  "lead_id": 42,
  "sku": "pen-test-web",
  "scope_notes": "Long discovery-call summary, >= 100 chars..."
}
```

Sidecar handles in sequence (each step has its own try/catch + structured failure response):

1. **Validate scope_notes length** (≥ 100 chars).
2. **Fetch Krayin lead** — via the `webhook-lead-by-email.php` endpoint
   OR direct mysql2 connection. Need to decide which; HTTP is simpler.
3. **Load SKU + templates from disk** (already mounted at `/data/templates`).
4. **Call Claude API** (Sonnet 4.6, ephemeral cache).
5. **Parse Claude JSON + validate** (sum-match, needs_more_info, price-range cap).
6. **Render markdown → PDF via pandoc** (existing logic).
7. **POST PDF to Documenso `/api/v1/documents`** to create signature envelope.
8. **POST to Krayin webhook** to move stage → Proposal Sent.
9. **Log Claude cost to warehouse** via direct pg connection (need pg npm package).

Returns:
```json
{
  "ok": true,
  "proposal_ref": "UW-42-20260523-3F2A",
  "documenso_envelope_id": "cmphxxx",
  "total_aed": 14000,
  "pdf_size": 54677
}
```

OR on failure:
```json
{
  "ok": false,
  "step": "claude_api",
  "reason": "Claude returned needs_more_info",
  "details": ["healthcare org name", "audit deadline"]
}
```

## n8n workflow 07 (after rewrite — 5 nodes)

```json
{
  "nodes": [
    { "type": "formTrigger", "name": "Form: post-discovery scoping" },
    { "type": "httpRequest", "name": "Call sidecar /proposal" },
    { "type": "if",          "name": "Sidecar succeeded?" },
    { "type": "httpRequest", "name": "Slack: announce" },
    { "type": "httpRequest", "name": "Slack: halt notice" }
  ]
}
```

n8n's role reduced to: form → HTTP call → IF branch → Slack. Nothing
else. No cross-node lookups, no SQL nodes, no Code nodes, no JS-side
template logic.

## Sidecar dependencies to add

In `pandoc-render/package.json`:
- `mysql2` — for Krayin lead fetch (or keep using webhook-lead-by-email.php)
- `pg`     — for warehouse spend logging
- `axios` or `node-fetch` — for Claude / Documenso / Krayin webhook calls

All small, well-known packages. Already vetted patterns.

## Environment variables sidecar needs

Add to `pandoc-render` service in docker-compose:
```yaml
environment:
  - SHARED_TOKEN=${PANDOC_RENDER_TOKEN}
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  - DOCUMENSO_API_KEY=${DOCUMENSO_API_KEY}
  - KRAYIN_WEBHOOK_URL=http://krayin/webhook-lead-update.php
  - KRAYIN_WEBHOOK_TOKEN=${KRAYIN_WEBHOOK_TOKEN}
  - KRAYIN_DB_HOST=krayin-db
  - KRAYIN_DB_USER=krayin
  - KRAYIN_DB_PASSWORD=KrCrmUnderwings2026x
  - WAREHOUSE_DB_HOST=metrics-db
  - WAREHOUSE_DB_USER=warehouse_admin
  - WAREHOUSE_DB_PASSWORD=${METRICS_DB_PASSWORD}
```

## Implementation plan (~90 min)

1. Add npm deps to `pandoc-render/package.json` (10 min).
2. Implement `POST /proposal` endpoint in `pandoc-render/server.js` (60 min).
3. Test via curl from the host (10 min).
4. Replace `n8n/workflows/07-proposal-generator.json` with the 5-node version (10 min).
5. Import + smoke test end-to-end from the form.

## What stays as-is

- Templates (`templates/proposals/*.md` + `_shared-footer.md`) — unchanged.
- SKU catalogue (`templates/skus.yml` + `.json`) — unchanged.
- Claude prompt (`prompts/proposal-generation.md`) — unchanged.
- Documenso instance + API key — unchanged.
- Workflow 08 (signature webhook receiver) — unchanged, keeps current
  shape since it's a single receiver.

## Open questions

1. **Krayin lead fetch — webhook or direct DB?** Webhook is consistent
   with how n8n currently does it; direct DB is one less hop. Defaults
   to webhook for v1 (already tested), revisit if perf matters.

2. **Sidecar HTTP timeout for the full proposal flow?** Claude API
   call alone can take 10–20s; Documenso + Krayin + warehouse add
   another 2–5s. Allow 60s timeout from n8n. Set Express
   `server.setTimeout(60000)` on the sidecar.

3. **What does n8n do while sidecar is working?** n8n's HTTP node
   blocks until the response. Acceptable since each proposal is a
   one-off; no batch concurrency.

## Acceptance criteria

- Workflow 07 has ≤ 5 nodes total.
- Submitting the form with a valid lead_id + SKU + scope_notes ends
  with a Documenso envelope created AND Krayin lead moved to
  "Proposal Sent" AND a Slack message in `#sales-pipeline`.
- A halt case (scope_notes < 100 chars OR Claude `needs_more_info`)
  ends with a Slack halt notice and NO Documenso envelope.
- An error in any sidecar step returns a structured `{ok:false, step}`
  response that the n8n IF node routes to the halt-notice branch.

---

End of spec. Pick up with this file in the next session.
