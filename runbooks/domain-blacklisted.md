# Runbook — Underwings sending domain is blacklisted / reputation cooked

> **Severity:** P1 — outbound email delivery degraded or zero.
> **Time to mitigation:** ≥ 7 days (reputation repair is slow).

## Detect

- Reply rate / open rate drops to near zero on a previously healthy campaign.
- Bounce rate spikes (> 5% for transactional, > 2% for newsletter).
- Recipient reports "going to spam" / "didn't receive".
- Manual check on:
  - https://mxtoolbox.com/blacklists.aspx
  - https://postmaster.google.com/managedomains (Gmail-specific)
  - https://mail-tester.com (send a test, get a reputation score)
  - https://www.sender-score.com (free tier)

## Triage

```bash
# How much have we sent in the last 24h, by Stalwart?
docker compose logs mail | grep -i 'outbound\|sent\|deferred\|bounced' | tail -50

# DNS records still healthy?
dig +short TXT underwings.org | grep -i spf
dig +short TXT _dmarc.underwings.org
dig +short TXT default._domainkey.underwings.org | head -1

# Brevo relay (most outbound for marketing uses Brevo)
# Check Brevo dashboard for "complaints" or "blocks" — they will pause your account first
```

## Mitigate

### Immediate (today)
1. **Stop all outbound** sending. n8n: pause workflows that send email
   (07 proposal kickoff, 08 onboarding, 14 daily summary).
2. **Identify which sender** is poisoning — newsletter (Brevo), transactional
   (Stalwart), or both.
3. **Identify the trigger** — recent campaign, recent recipient list,
   recent template change.
4. **Notify Brevo / SMTP provider** before they suspend us. Email their
   abuse team with: what we sent, recipient count, complaint rate.

### Short-term (this week)
1. **Warm a new subdomain** — set up `mail2.underwings.org` with its own
   SPF/DKIM/DMARC. Slowly (≤ 20 emails/day for 3 weeks) ramp up to recover.
2. **Audit content** — was the recent send too "salesy" / spammy
   keywords / unauthenticated images / no unsubscribe?
3. **Verify list hygiene** — recipient list was opted-in only?
4. **Update DMARC** from `p=quarantine` to `p=reject` if not already, after
   confirming all legitimate senders are aligned. (Stricter = stronger
   future reputation.)

### Long-term (this month)
1. **Separate sending domains** — `mail.underwings.org` for transactional,
   `newsletter.underwings.org` for marketing. Reputation isolation.
2. **Run pre-send mail-tester check** on every new outbound template.
3. **Set Brevo sending limits** explicitly low until reputation rebuilds.
4. **Document the postmortem** here so this doesn't recur.

## Don't do this

- **Don't switch SMTP provider mid-incident** — it makes the trace harder
  and your reputation problem follows the domain, not the provider.
- **Don't send "we apologise, please open this email" follow-ups** —
  every additional send while blacklisted compounds the damage.
- **Don't rotate to a completely different domain** — you lose the brand
  recognition and SEO/inbound traffic that points to underwings.org.

## Reputation tracking (set up after first incident)

- Add Google Postmaster Tools (you must own the DNS — current GoDaddy
  delegation lets you add the verification TXT record).
- Add Microsoft Smart Network Data Services (SNDS) for Outlook visibility.
- Subscribe to AbuseIPDB notifications.
