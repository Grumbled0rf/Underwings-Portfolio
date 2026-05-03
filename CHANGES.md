# Strategic Update v2 — CHANGES

Implementation of the 4-pillar UAE-market business-model update:
4-tier pricing · founding-client program · healthcare wedge · continuous compliance subscription.

## Files Modified

### Homepage
- `frontend/src/pages/index.astro` — replaced "Starting AED X" with "From AED X" + "Starter · Essentials · Professional · Enterprise" sub-label across 5 pillar cards; removed Founding Client ribbon and its CSS; added new Founding Client Program section (4 value-swap cards, 2x2 grid); restructured Industries section into featured Healthcare panel + 5-industry grid (removed Healthcare card from grid); bumped GRC pillar card from "5 services" to "6 services" + NEW badge + Continuous Compliance pill; added Continuous Compliance option to contact form `<select>`.

### Services hub
- `frontend/src/pages/services/index.astro` — removed Founding Client ribbon and its CSS.

### Pillar pages (4-tier pricing block via shared component)
- `frontend/src/pages/services/offensive-security/index.astro` — added `tiers` data + `<PricingTiers>` block; replaced "15% bundle discount" footnote with neutral wording.
- `frontend/src/pages/services/cloud-security/index.astro` — added `tiers` data + `<PricingTiers>` block.
- `frontend/src/pages/services/network-infrastructure/index.astro` — added `tiers` data + `<PricingTiers>` block.
- `frontend/src/pages/services/grc/index.astro` — added `tiers` data + `<PricingTiers>` block; added Continuous Compliance Subscription as featured RECURRING flag-card at top of `flagship` array; updated card render to handle `isRecurring` + `flag-card-recurring` styling.
- `frontend/src/pages/services/training-awareness/index.astro` — added `tiers` data + `<PricingTiers>` block.

### Other 15%-discount removals
- `frontend/src/pages/services/grc/iso-27001-gap-assessment.astro` — replaced "15% discount on Implementation fee" (FAQ + commercial terms) with "gap-assessment fee credited against Implementation".
- `frontend/src/pages/services/training-awareness/security-awareness-training.astro` — replaced "15% returning-client discount" with "Priority scheduling for returning clients".

### Components & Footer
- `frontend/src/components/Header.astro` — added Continuous Compliance Subscription entry under GRC in desktop mega-menu (`nav-mega-sub`) and mobile drawer (`mob-link-sub`); added CSS for `nav-mega-sub`, `nav-mega-new`, `mob-link-sub`.
- `frontend/src/components/Footer.astro` — added Continuous Compliance link under Cybersecurity GRC in services list.

### Shared styles
- `frontend/src/styles/category-hub.css` — appended `.tier-*` 4-tier pricing block styles (responsive: 4-cols → 2x2 → stack); added `.cat-tiers` mini-label, `.cat-new-badge`, `.cat-service-pill-new` (homepage GRC pillar accents); added `.flag-badge-recurring` + `.flag-card-recurring` (GRC subscription card highlight).

## Files Created

- `frontend/src/components/PricingTiers.astro` — reusable 4-tier pricing block (Starter / Essentials / Professional / Enterprise). Accepts `serviceSlug`, `tiers`, optional `eyebrow`, `heading`, `sub`, `starterNote`. Auto-emits Starter SME note, "Most popular" badge for `popular: true`, contact CTA with `?service=<slug>&tier=<tier>`, and "Not sure which tier fits?" follow-up CTA. Used by all 5 pillar pages.
- `frontend/src/pages/services/grc/continuous-compliance-subscription.astro` — full new service page (hero, who-for, what's-included grid, monthly deliverables, 3 subscription tiers, subscriber benefits, FAQ, footer CTA). Schema.org Service + FAQPage markup.
- `CHANGES.md` — this file.

## Judgment Calls

- **Spots-remaining counter:** kept HTML comment placeholder `<!-- TODO: Re-enable spots-remaining counter after 2-3 named founding clients -->` in `pages/index.astro` near the Founding Client CTA. Per spec, no numeric counter shown until 2–3 named founding clients exist.
- **Founding Client section placement:** the spec said "replace the removed banner area" but the banner was a small ribbon above H1 and the new content is a 4-card grid section. Placed it as a full section between the 5-pillar grid and the "Cybersecurity Software Sales" section so it sits high in the homepage flow without crowding the hero.
- **Healthcare panel image:** spec said "use an existing brand graphic or a clean ADHICS/medical iconography — do not generate new images, use placeholder if needed". Used a small inline SVG built from existing brand colour tokens (#24d758 + #27dab4). No new raster asset added.
- **Bundling discount on offensive-security:** the legacy `scope-footnote` advertised "15% / 20%" stacking discounts. Per spec ("All 15% off / save up to 15% / Founding Client discount language is removed everywhere") the wording was rewritten neutrally — bundling still implicitly reduces cost, but no headline percentage promised.
- **Tabletop wording:** copy uses the spec's "90-minute walkthrough" phrasing per AC #7.
- **Healthcare grid removal:** also dropped the "Healthcare" card from the 6-card industries grid, leaving 5 cards as required.
- **Continuous Compliance pricing chip on homepage:** added a green-accented pill `cat-service-pill-new` reading "Continuous Compliance · From AED 4,000/mo" inside the GRC pillar card so the new offering is visible at a glance from the homepage.

## Conflicts with existing copy

- The previous "Bundle 2+ scopes for 15% / 20%" footnote on Offensive Security was discount-style language. Rewritten to retain the bundling concept without committing to a fixed discount percentage.
- The previous "Implementation upgrade" terms on the ISO 27001 Gap Assessment page used a 15% discount mechanism. Reframed as "gap-assessment fee credited against Implementation" — same client outcome, no percentage discount language.
- The previous "Annual repeat: 15% returning-client discount" line on Security Awareness Training was reframed to "Priority scheduling for returning clients" to align with the spec's value-swap-not-discount stance.

## Verification

- `npm`/`node` not available in this shell — full Astro build not executed locally. Manual verification (run before merge):
  - `cd frontend && npm install && npm run build`
  - `cd frontend && npm run dev` then spot-check: homepage, /services, /services/{offensive-security,cloud-security,network-infrastructure,grc,training-awareness}, /services/grc/continuous-compliance-subscription, contact form dropdown, mobile drawer, navigation hover.
  - Mobile responsive check for the new 4-tier `tier-grid` (1024px+: 4 cols, 768–1023px: 2x2, <768px: stack with Professional highlighted).
- Static checks performed:
  - All `<section>` open/close tags balanced in every modified file.
  - `import PricingTiers` present in all 5 pillar pages; component file exists.
  - Zero remaining occurrences of "Starting AED", "15%", "save up to", "founding-ribbon", or "foundingPulse" in `frontend/src/`.
  - All internal links to `/services/grc/continuous-compliance-subscription` resolve to a real file.

## Commit

```
strategic update v2: 4-tier pricing, founding client program, healthcare wedge (stage-appropriate), continuous compliance subscription
```
