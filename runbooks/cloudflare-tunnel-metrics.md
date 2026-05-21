# Runbook — Cloudflare Tunnel for `metrics.underwings.org`

> **Purpose:** expose Metabase publicly via Cloudflare Tunnel + Cloudflare Access
> (Zero Trust) without migrating DNS away from GoDaddy.
> **Audience:** founder (initial setup is browser-only); claude-code (cloudflared
> install on VPS).
> **Time:** ~15 minutes end-to-end.

## Why a tunnel and not a public LE cert?

- DNS is on GoDaddy, so we can't put Cloudflare in front of the zone the usual
  way (orange-cloud proxy needs Cloudflare to manage the zone).
- Cloudflare Tunnel works regardless of DNS provider: cloudflared makes an
  outbound connection from the VPS to Cloudflare, and Cloudflare serves the
  public hostname.
- We get Cloudflare Access (email-magic-link, no password to manage) on top of
  it for free.

## One-time setup

### Step 1 — Cloudflare account (founder, browser)
1. Sign up at https://dash.cloudflare.com if you don't already have one.
2. Top-left → "Zero Trust" → Get started.
3. Pick a team name (e.g. `underwings`). Free plan is fine for ≤50 users.

### Step 2 — Create the tunnel (founder, browser)
1. Zero Trust dashboard → **Networks → Tunnels → Create a tunnel**.
2. Connector type: **Cloudflared**.
3. Tunnel name: `underwings-vps`.
4. Click **Save tunnel**. You'll land on an install page — **stop here and copy
   the `cloudflared service install <TOKEN>` command shown**. The token is
   what claude-code needs on the VPS.

### Step 3 — Install cloudflared on the VPS (claude-code)
Run on `/home/deployer`:
```bash
# Add cloudflared apt repository (Debian/Ubuntu)
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared

# Install the tunnel as a systemd service using the token from Step 2
sudo cloudflared service install <TOKEN>

# Verify
sudo systemctl status cloudflared
```

### Step 4 — Add the public hostname (founder, browser)
Back in the Zero Trust dashboard tunnel page:
1. **Public Hostname → Add a public hostname**.
2. Subdomain: `metrics`, Domain: `underwings.org`.
3. Service: `http://underwings-nginx:80`.
   - **Important:** cloudflared runs on the host network, not the docker
     network. Use `http://127.0.0.1:80` instead and set the
     `Host` header override below to `metrics.underwings.org` so nginx routes
     by `server_name` correctly.
4. Additional application settings → HTTP Settings → **HTTP Host Header:
   `metrics.underwings.org`**.
5. Save.

### Step 5 — Point GoDaddy CNAME at the tunnel (founder, browser)
The tunnel page in Cloudflare shows a `<tunnel-uuid>.cfargotunnel.com`
target. In GoDaddy DNS:
- **Type:** CNAME
- **Name:** `metrics`
- **Value:** `<tunnel-uuid>.cfargotunnel.com`
- **TTL:** 1 hour

Wait 5–60 minutes for DNS to propagate (`dig +short metrics.underwings.org`
should show the cfargotunnel target).

### Step 6 — Configure Cloudflare Access policy (founder, browser)
1. Zero Trust → **Access → Applications → Add an application**.
2. Type: **Self-hosted**.
3. Application name: `Underwings Metrics`.
4. Session duration: 24 hours.
5. Application domain: `metrics.underwings.org`.
6. **Add policy**:
   - Name: `Underwings principals`
   - Action: **Allow**
   - Include rule: **Emails → enter** `manoj@underwings.org`,
     `nelson@underwings.org`, `vinoth@underwings.org`.
7. Save the application.

### Step 7 — Smoke test (anyone)
1. From a browser logged out of Cloudflare, visit https://metrics.underwings.org.
2. You should see a Cloudflare login screen prompting for an email.
3. Enter one of the allowlisted emails → check that inbox for the magic-link
   email → click → land on the Metabase setup page.
4. Set up the Metabase admin account on first visit:
   - **Email:** the first founder logging in
   - **Site name:** Underwings Metrics
   - **Skip "set up your first dashboard" — it's added by Phase B's ETL workflow.**

## Rolling back / pausing access

- Pause access (keep tunnel, deny everyone): change the Access policy action
  to "Block".
- Remove the public hostname: tunnel → public hostname → delete row.
- Delete the tunnel entirely: Zero Trust → Networks → Tunnels → delete +
  `sudo cloudflared service uninstall` on the VPS.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `metrics.underwings.org` resolves to 0.0.0.0 / NXDOMAIN | DNS not propagated yet | Wait or use `dig @8.8.8.8 metrics.underwings.org` to confirm propagation outside your resolver |
| Cloudflare login appears but no magic-link email | SMTP issue at Cloudflare or wrong email | Use a known-good email; check spam |
| After login, browser shows 502 | cloudflared can't reach underwings-nginx | Check `sudo systemctl status cloudflared` and that the public hostname service target uses `127.0.0.1:80` with Host header override |
| After login, browser shows 301 to `underwings.org` | Host header not preserved | The tunnel's HTTP Settings must set `HTTP Host Header: metrics.underwings.org` — see Step 4 |
| Metabase complains about HTTPS / wrong cookie domain | `MB_SITE_URL` mismatch | Already set to `https://metrics.underwings.org` in docker-compose; restart metabase if you changed it |

## Notes

- The tunnel adds zero attack surface to the VPS — there are no inbound ports
  opened. All traffic is initiated outbound from the VPS to Cloudflare.
- Cloudflare Access logs every login attempt in the Zero Trust dashboard →
  Logs → Access. Useful for compliance (Phase F).
- Free plan supports up to 50 Access seats. We need 3.
