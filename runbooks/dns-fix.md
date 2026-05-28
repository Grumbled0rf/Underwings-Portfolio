# Runbook — DNS / Cloudflare record fixes

**Zone:** `underwings.org` · **Cloudflare Zone ID:** `81826ee1f0b642162d025e37f906c95a`
**Origin server IP:** `143.244.135.89`
**Last incident:** 2026-05-27 — `plan` + `mail` reported down; root-caused to missing
/ misconfigured Cloudflare DNS records left over from the DNS migration.

> Secrets: there is **no** Cloudflare API token stored on the box. To make changes
> you create a short-lived custom token (perms below), use it, then revoke it.
> Never commit a token.

---

## Architecture (how each kind of service is exposed)

- **Web services → proxied A records** (orange cloud) → `143.244.135.89`, where
  nginx (`underwings-nginx`, host :443) terminates and proxies to the container.
  Examples: `crm`, `docs`, `apps`, `drive`, `status`, `webmail`, `www`, root,
  and (added 2026-05-27) `book`, `plan`, `mailmonk`.
- **A few services → Cloudflare Tunnel CNAME** → `80ed5a77-4ea3-479e-8c70-9a73ecc0d316.cfargotunnel.com`
  (proxied). Examples: `metrics` (Metabase), `sign` (Documenso). The tunnel runs
  on the host via `cloudflared --token …` (token-managed; ingress lives in the
  Cloudflare Zero-Trust dashboard, NOT in a local file).
- **Mail host `mail.underwings.org` → DNS-only A record (grey cloud)** →
  `143.244.135.89`. MUST be grey: Cloudflare's proxy only passes 80/443, so a
  proxied mail host breaks SMTP/IMAP (25/465/587/143/993).

### Service → hostname map (don't guess — these are the real names)
| Service | Hostname | Exposure |
|---|---|---|
| Astro site | `underwings.org`, `www` | proxied A |
| Krayin CRM | `crm` | proxied A |
| AFFiNE docs | `docs` | proxied A |
| Cal.com booking | `book` | proxied A |
| Plane PM | `plan` | proxied A |
| Metabase | `metrics` | tunnel CNAME |
| Documenso | `sign` | tunnel CNAME |
| Newsletter (Keila/Listmonk) | `mailmonk` | proxied A |
| n8n | `n8n` | CNAME → underwings.org (proxied) |
| Webmail (Roundcube) | `webmail` | proxied A → nginx → webmail:80 |
| Mail server (Stalwart) | `mail` | **grey-cloud A** (SMTP/IMAP) |

nginx also serves `mail.underwings.org` over 443 → `stalwart:8080` (admin/JMAP);
the user-facing webmail is `webmail.underwings.org` → `webmail:80`.

---

## What was wrong + fixed (2026-05-27)

| Symptom | Cause | Fix |
|---|---|---|
| `plan.underwings.org` not resolving | no DNS record | created proxied A → `143.244.135.89` |
| `book.underwings.org` down (blog CTAs broken) | no DNS record | created proxied A → `143.244.135.89` |
| `mailmonk.underwings.org` down | no DNS record | created proxied A → `143.244.135.89` |
| mail clients can't connect (SMTP/IMAP) | `mail` was **proxied** (orange) | set `mail` to **DNS-only** (grey) |
| MX showed `_dc-mx.<hash>` | Cloudflare companion record for a *proxied* mail host | auto-resolved once `mail` set to grey (MX → `mail.underwings.org`) |

All container/nginx config was already correct — this was 100% a Cloudflare DNS issue.

---

## How to fix (repeat for any future missing/broken record)

### 1. Create a short-lived Cloudflare API token
Dashboard → My Profile → API Tokens → Create Custom Token:
- **Zone : DNS : Edit** (zone `underwings.org`)
- **Zone : Zone : Read**
- (only if touching email routing) **Zone : Email Routing Addressing : Edit**
- (only if touching the tunnel's public hostnames) **Account : Cloudflare Tunnel : Edit**
- TTL: expire end of day. **Revoke immediately after use.**

### 2. Commands (export the token first; do NOT paste it into files)
```bash
CF="<paste-token>"
ZID=81826ee1f0b642162d025e37f906c95a
api(){ curl -s -H "Authorization: Bearer $CF" -H "Content-Type: application/json" "$@"; }

# verify token
api https://api.cloudflare.com/client/v4/user/tokens/verify

# list records (source of truth)
api "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records?per_page=200"

# create a proxied web record (Cal.com-style)
api -X POST "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records" \
  --data '{"type":"A","name":"<sub>","content":"143.244.135.89","proxied":true,"ttl":1}'

# un-proxy a record (e.g. mail) — needs the record id from the list above
api -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/<RECORD_ID>" \
  --data '{"proxied":false}'
```

### 3. Verify (use PUBLIC resolvers — this box's resolver negative-caches NXDOMAIN)
```bash
# resolution from the internet's view
curl -s 'https://dns.google/resolve?name=plan.underwings.org&type=A'

# end-to-end via the real Cloudflare edge IP (bypasses local stale cache)
IP=$(curl -s 'https://dns.google/resolve?name=<sub>.underwings.org&type=A' \
     | python3 -c 'import sys,json;print(json.load(sys.stdin)["Answer"][0]["data"])')
curl -s -o /dev/null -w "HTTP:%{http_code}\n" --resolve "<sub>.underwings.org:443:$IP" "https://<sub>.underwings.org/"

# mail: direct IP + live SMTP banner
exec 3<>/dev/tcp/143.244.135.89/587 && head -1 <&3   # expect: 220 mail.underwings.org Stalwart ESMTP
```

---

## Gotchas (learned the hard way)
- **This VPS's own resolver (systemd-resolved) negative-caches NXDOMAIN** for the
  SOA negative-TTL. After adding a record, the *server* may still say "could not
  resolve" for a few minutes even though the public internet resolves it fine.
  Always verify with `dns.google` / `cloudflare-dns.com` DoH, not local `getent`.
- **New proxied hostnames take a minute or two for Cloudflare's edge SSL** to
  provision — until then HTTPS may return `000`. Not an error; wait and re-test.
- **Mail host must stay grey-cloud.** If someone re-proxies `mail`, SMTP/IMAP break
  again and Cloudflare re-injects the `_dc-mx` companion MX.
- The 5 web services use **proxied A → origin**, NOT the tunnel. Only `metrics`
  and `sign` use the tunnel. To add a tunnel-routed hostname you also need a
  Public Hostname entry in Zero-Trust (Account : Cloudflare Tunnel : Edit), not
  just a DNS record.
