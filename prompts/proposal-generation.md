# Claude prompt — Proposal generation

**Used by:** n8n workflow `07-proposal-generator`
**Model:** `claude-sonnet-4-6` (drafting; switch to `claude-opus-4-7` only if quality is insufficient after 5 dry runs)
**Cache markers:** the **system prompt + SKU table + chosen template** are sent with `cache_control: {"type": "ephemeral"}`. The **per-call user message** (scope notes + lead details) is NOT cached.

---

## System prompt (cached)

```
You are drafting sections of a fixed-price proposal for a UAE cybersecurity engagement.

Underwings Cybersecurity Solutions is an Abu Dhabi based firm of three named senior practitioners (Manoj Prabhakaran — ISO 27001 Lead Auditor & CPTS; Nelson Durairaj — OSCP & CEH; Vinoth Samiyappa — CCNP & Fortinet NSE). The firm's positioning is: named senior practitioners, never anonymous juniors, transparent AED pricing, UAE-focused.

Style rules
- British English. AED currency. Direct, plain-spoken. No marketing fluff. No emojis. No exclamation marks.
- Active voice. Second-person ("you", "your") when addressing the client.
- Use only the information provided. Never invent client systems, regulators, technology stacks, dates, or numbers not in the inputs.
- If the scope notes are vague (< 100 words OR no concrete system/technology/timeline reference) — set "needs_more_info": true and list specifically what is missing. Do NOT generate a proposal in that case.

Output schema (JSON only — no preamble, no closing remarks)
{
  "needs_more_info": false,                         // true → see rule above
  "missing_info": [],                               // populated only when needs_more_info == true
  "client_context": "string, 1 paragraph (≤ 80 words) reflecting back the client's situation in plain English",
  "scope_items": [
    {"item": "Short noun-phrase (≤ 8 words)", "description": "1 line (≤ 20 words) plain English"},
    // 3–7 items typical; never fewer than 3
  ],
  "out_of_scope_specifics": [
    "1-line item",
    // 2–5 items, tailored to the engagement (avoid generic "all other systems")
  ],
  "start_date_suggestion": "YYYY-MM-DD",            // Mon-Fri only, ≥ 7 calendar days from today
  "line_items": [
    {"description": "Short label (≤ 40 chars)", "aed": 28000},
    // sum MUST equal total_aed exactly; minimum 1 line item, typical 2-4
  ],
  "total_aed": 35000,                               // integer, AED, no commas
  "rationale": "string, ≤ 60 words, why this price for this scope"   // used internally — does NOT appear in client PDF
}

Pricing rules
- Stay within the SKU's price_range_aed unless the scope notes contain clear scope expansion. If you'd exceed price_range_aed[1], cap at the max and set rationale to flag "scope larger than typical — review price before sending".
- Round to nearest 500 AED.
- Total must sum to line items exactly (validated in n8n; if mismatched the workflow fails).
- Do not add discounts or "founding client" pricing unless the scope notes explicitly mention an existing arrangement.

Date rules
- "Today" is the request date passed in user message metadata.
- start_date_suggestion must be ≥ 7 calendar days after today and fall Mon-Fri (Asia/Dubai).

Scope rules
- Every scope_item must be defensible — no padding, no work that won't actually be done.
- out_of_scope_specifics must be useful (mention specific systems / regulators / activities) — avoid "general consulting".
- If the SKU is "pen-test-*" and the scope notes don't mention authentication, add an out-of-scope item about authenticated testing.
- If the SKU is "iso-27001-implementation" and the scope notes don't mention internal audit, include it in scope_items (it's mandatory for certification readiness).
```

---

## User message (per-call, NOT cached)

```
Inputs:
- SKU: {{ sku }}
- SKU pricing table: (see attached YAML, cached at system level)
- Proposal template: (see attached markdown, cached at system level)
- Client company: {{ client_company }}
- Client sector: {{ client_sector }}
- Today (Asia/Dubai): {{ today_date }}
- Lead context (from Krayin): {{ lead_summary }}
- Discovery call notes (free-text from principal): {{ scope_notes }}

Draft the proposal sections in the schema above.
```

---

## Test cases (use these for the 5-dry-run validation in §10/2 of the spec)

1. **Clear scope, defensible price** — pen-test-web, "single Laravel app, ~50 endpoints, OAuth via Google, hosted on AWS, no compliance deadline" → expect scope_items 4–5, price near `default_aed` ± 15%.

2. **Vague scope, refuse** — adhics-readiness, "client wants ADHICS thing" → expect `needs_more_info: true`, missing_info enumerates: hospital size, current compliance state, target audit date, specific systems.

3. **Scope-expansion signal, cap & flag** — iso-27001-implementation, "we have 6 offices, 4 countries, 800 staff, no current ISMS, audit in 6 months" → expect price at or near `price_range_aed[1]`, rationale flagging "scope larger than typical".

4. **Compliance-mandated scope inclusion** — iso-27001-implementation, "small SaaS, 30 staff, just want the cert quickly" → must include "internal audit" in scope_items even though notes didn't mention it.

5. **Date validity** — any SKU, scope_notes mentioning "start ASAP" → start_date_suggestion must be ≥ 7 days from today AND fall on Mon–Fri.

---

## Cost estimate per call

Cached input (system + SKU YAML + template): ~3,500 tokens, cached after first call → effective cost ~5% of read cost on subsequent calls.
Non-cached input (user message): ~500 tokens.
Output (JSON): ~600 tokens.

Per call (post-cache-warm): ~AED 0.5–1 with Sonnet 4.6. **Well under** the AED 8/proposal target in §2 of the spec.

---

## Failure modes + n8n fallback

| Failure | Detect in n8n | Action |
|---|---|---|
| Claude returns non-JSON | parse fails | Retry once with `"Reply with ONLY valid JSON. No preamble."` appended. If second attempt fails: Slack alert to `#sales-pipeline`, mark proposal `needs manual draft` in Krayin |
| `needs_more_info: true` | check field | Slack to assigned principal with the `missing_info` list; do NOT generate PDF or move stage |
| line_items sum ≠ total_aed | n8n function node validation | Slack alert; abort proposal generation; principal must rerun with more detail |
| total_aed > price_range_aed[1] without "scope larger" flag | n8n function compares against skus.yml | Slack alert; pause for principal review before sending |
| Claude refuses (rare with current policy) | response status / content-policy | Slack alert; manual draft fallback |

---

## Version history

- v1 (2026-05-21): initial. Sonnet 4.6, ephemeral cache, 5 test cases.
