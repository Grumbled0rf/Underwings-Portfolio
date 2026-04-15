# Phase 1 — nginx 301 Redirect Rules

**Version:** 1.0
**Date:** 15 April 2026
**Status:** Draft for approval
**Target file:** `/home/deployer/underwings/nginx/nginx.conf`

---

## 1. Purpose

Preserve SEO value of all existing `underwings.org` service URLs by 301-redirecting them to their new homes in the 5-category × 15-service information architecture. Google treats a well-configured 301 as near-full equity transfer, so incoming links and historical rankings are retained.

## 2. Placement in `nginx.conf`

Insert the redirect block **inside the `underwings.org` HTTPS `server { }` block**, **before** the existing `location /` directive that proxies to the Astro app. `location =` (exact match) directives take precedence over `location /`, so the redirects fire before the proxy catches the request.

## 3. The redirect block

```nginx
    # ===========================================
    # underwings.org — 301 redirects for content reconstruction (Apr 2026)
    # Old IA: flat services/ tree
    # New IA: 5 categories (offensive-security, cloud-security, network-infrastructure, grc, training-awareness)
    # ===========================================

    # Old: VAPT page → New: Network Penetration Testing (flagship offensive page)
    location = /services/vapt {
        return 301 https://underwings.org/services/offensive-security/network-penetration-testing;
    }

    # Old: ISO 27001 (single page) → New: ISO 27001 Implementation & Certification Support
    location = /services/iso-27001 {
        return 301 https://underwings.org/services/grc/iso-27001-implementation;
    }

    # Old: Security Audit (ambiguous multi-framework page) → New: GRC category hub
    location = /services/security-audit {
        return 301 https://underwings.org/services/grc;
    }

    # Old: Consultation (vCISO / IR retainer / advisory) → New: GRC category hub (vCISO deferred to Year 2)
    location = /services/consultation {
        return 301 https://underwings.org/services/grc;
    }

    # Old: Training (broad training umbrella) → New: Security Awareness Training (flagship)
    location = /services/training {
        return 301 https://underwings.org/services/training-awareness/security-awareness-training;
    }

    # /software stays on the same top-level URL — no redirect needed
    # /services stays on the same URL but gets rewritten to the 5-category master hub
```

## 4. Preservation list (NO redirect — URL stays the same)

These URLs are kept and their content rewritten in place:

- `/` — homepage
- `/about`
- `/services` — rewritten as 5-category master hub
- `/blog` and `/blog/[slug]`
- `/careers`
- `/updates`
- `/brand`
- `/privacy-policy`
- `/ar` — Arabic homepage
- `/software` — rewritten as Software Channel page
- `/404`, `/500`

## 5. Testing protocol (before deployment)

1. Add the block to a staging copy of `nginx.conf`.
2. Validate syntax: `docker exec underwings-nginx nginx -t`
3. Reload nginx in staging: `docker exec underwings-nginx nginx -s reload`
4. Verify each redirect returns exactly **HTTP 301** and lands at the correct new URL:
   ```bash
   curl -sI https://underwings.org/services/vapt | head -n 4
   curl -sI https://underwings.org/services/iso-27001 | head -n 4
   curl -sI https://underwings.org/services/security-audit | head -n 4
   curl -sI https://underwings.org/services/consultation | head -n 4
   curl -sI https://underwings.org/services/training | head -n 4
   ```
5. Confirm `Location:` header in each response matches the target URL exactly.
6. Check Google Search Console for "Crawl Errors" 24 hours after deployment.

## 6. Deployment order (important)

**The redirects must NOT be deployed before the new target pages are live**, otherwise Google will find 301 chains pointing to 404s. Correct order:

1. New pages built and deployed (Phase 2 + 3)
2. Internal links updated to new URLs (Phase 3 polish)
3. Redirects deployed (start of Phase 4)
4. `sitemap.xml` regenerated and submitted to Google Search Console
5. Post-deploy: crawl error monitoring for 7 days

## 7. Rollback

If traffic or crawl errors spike after deploy:

1. Comment out the redirect block in `nginx.conf`
2. `docker exec underwings-nginx nginx -s reload`
3. Investigate root cause; old URLs resume serving original pages (if still present) or return 404 (which is the current pre-reconstruction behaviour anyway)

No data loss risk — redirects are stateless config.

## 8. Approval checklist

- [ ] Manoj confirms the 5 source URLs map to the correct 5 target URLs above
- [ ] Manoj confirms no additional URLs exist in old nginx logs that need redirects (e.g., historical deep-links, misspellings)
- [ ] Vinoth owns the staging test and deployment
- [ ] Deployment window scheduled (outside UAE business hours: 02:00 – 05:00 GST)

---

**End of phase1-nginx-redirects.md v1.0.**
