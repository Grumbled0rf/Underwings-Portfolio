# Runbook — Claude API is unavailable / quota exceeded / unexpectedly expensive

> **Severity:** P2 — lead scoring and proposal generation stop. Inbound capture still works.
> **Time to mitigation:** target ≤ 4 hours.

## Detect

- Workflows 02, 05, 07 fail at the "Claude" step (HTTP node returns non-2xx).
- Sudden spike in `ops.claude_api_calls` cost — daily AED ceiling alert from Metabase.
- Anthropic status page red.
- Slack `#ops` alert: "Claude cost > AED 100 today".

## Triage

```bash
# Recent failed executions
docker compose logs n8n | grep -i 'anthropic\|claude' | tail -30

# Today's spend
docker compose exec metrics-db psql -U warehouse_admin -d warehouse -c \
  "SELECT workflow_name, COUNT(*), ROUND(SUM(cost_aed)::numeric, 2) AS aed
   FROM ops.claude_api_calls
   WHERE called_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Dubai')
   GROUP BY workflow_name ORDER BY aed DESC;"

# Check API key is still valid
curl -sS https://api.anthropic.com/v1/messages \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-haiku-4-5","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

## Mitigate

### If API key invalid (401):
- Rotate via Anthropic Console → API Keys.
- Update `ANTHROPIC_API_KEY` in `.env`.
- `docker compose up -d n8n` to pick up new value.

### If quota / billing issue (429 with quota message):
- Check Anthropic Console → Usage.
- If running over budget: pause workflows 02, 05 (these are the high-volume ones); workflow 07 (proposal generator) is per-deal so keep that running.
- Top up account or raise quota.

### If genuine outage (5xx):
- All Claude-dependent workflows will fail. Two paths:
  1. **Pause + queue** (preferred for short outages): leave workflows active; n8n keeps the failed executions queued. Replay when API is back.
  2. **Fallback mode** (long outages): manually pause workflows 02 + 05 in n8n UI. Inbound capture (workflow 01) still works — leads land in Krayin's "New" stage without a score. Score manually when API returns.

### If cost spike on a healthy API:
- Most likely cause: a workflow loop or a malformed prompt. Check `ops.claude_api_calls` for which workflow is spending.
- Pause that workflow immediately in n8n UI.
- Investigate before re-enabling.

## Cost safety nets (already in place)

| Layer | Where | Target |
|---|---|---|
| Daily AED 100 alert | Metabase tile Q10 + Slack #ops | Trips on first sustained spend day |
| Workflow-level token cap (`max_tokens`) | Hard-coded per request | Prevents single-call blowouts |
| Prompt caching | `cache_control: ephemeral` on system+template | 90% cost reduction on repeat runs |
| Per-call cost log | `ops.claude_api_calls` | After-the-fact attribution |

If all four fail and cost is unbounded, set `ANTHROPIC_API_KEY=invalid` in `.env`
+ restart n8n. Hard kill on every Claude call.

## Postmortem

- Trigger?
- Were the cost guards tight enough? Adjust.
- Did anyone get a flat-line MQL day because of this? Notify Manoj.
