# Employee Profile Pages — Design

**Date:** 2026-05-07
**Status:** Approved (pending user review of this document)
**Owner:** Manoj Prabhakaran

## Goal

Give every Underwings employee a public, shareable profile page at `underwings.org/team/<slug>`. Each page is mobile-first, behaves as both a company bio and a digital business card (vCard save, click-to-email/call, LinkedIn, share, on-page QR + downloadable QR PNG), and is linked from the existing team cards on `/about`.

The URL itself is the deliverable — the founder will hand it out (printed business cards, email signatures, WhatsApp shares, QR scans).

## Scope

**In scope (six employees, today):**

| Slug | Name | Role |
|---|---|---|
| `manoj` | Manoj Prabhakaran | Founder |
| `nelson` | Nelson Durairaj | Senior Penetration Tester |
| `vinoth` | Vinoth Samiyappa | Co-founder · Networking |
| `gowtham` | Gowtham | CEO |
| `guna` | Guna | Business Development Manager |
| `prathima` | Prathima Selvaraj | Digital Marketing Manager |

**Out of scope:**
- Authentication / private profiles
- Admin UI for editing employee data (data lives in code; updates are PRs)
- Per-employee article/blog feeds
- Internationalisation (Arabic profile pages) — can be added later
- Photo upload pipeline — photos are dropped into `/public/team/` manually

## Architecture

### Data — single source of truth

New file: `frontend/src/data/team.ts`

```ts
export interface TeamMember {
  slug: string;             // url segment, e.g. "manoj"
  name: string;             // display name
  initials: string;         // 1–3 chars, used for fallback avatar
  role: string;             // job title shown under name
  badge?: 'Founder' | 'Co-founder';  // optional pill
  experience: string;       // e.g. "5+ Years in Cybersecurity"
  bio: string;              // 1–3 sentence short bio (reuses /about copy)
  certifications: string[]; // chip list
  email: string;            // TODO placeholders until founder confirms
  phone: string;            // TODO placeholder, E.164 format e.g. "+9715XXXXXXXX"
  linkedin: string;         // full URL, TODO placeholder
  photo?: string;           // public path, e.g. "/team/manoj.jpg"; undefined → initials avatar
}

export const team: TeamMember[] = [ /* six entries, copied from about.astro */ ];
```

`about.astro` is refactored to import and `.map()` over this array — eliminates duplication. Each card on `/about` becomes a clickable link to `/team/<slug>`.

### Routing

Astro file-based routing under `frontend/src/pages/team/`:

| Path | File | Output |
|---|---|---|
| `/team/<slug>` | `[slug].astro` | HTML profile page |
| `/team/<slug>.vcf` | `[slug].vcf.ts` | `text/vcard` download (vCard 3.0) |
| `/team/<slug>/qr.png` | `[slug]/qr.png.ts` | `image/png` QR code of the profile URL |

Each endpoint exports `getStaticPaths()` returning all six slugs. 404 is the default Astro behaviour for any other slug.

### vCard format (vCard 3.0)

Plain text endpoint, `Content-Disposition: attachment; filename="<slug>.vcf"`:

```
BEGIN:VCARD
VERSION:3.0
N:<lastName>;<firstName>;;;
FN:<name>
ORG:Underwings Cybersecurity Services
TITLE:<role>
EMAIL;TYPE=WORK:<email>
TEL;TYPE=CELL,WORK:<phone>
URL:https://underwings.org/team/<slug>
URL;TYPE=LinkedIn:<linkedin>
END:VCARD
```

Tested target: opening the `.vcf` on iOS Safari and Android Chrome triggers the native "Add to Contacts" sheet.

### QR generation

- Library: [`qrcode`](https://www.npmjs.com/package/qrcode) (small, no native deps, used at request/build time only)
- Endpoint generates a 600×600 PNG with `errorCorrectionLevel: 'M'`, dark Underwings green (`#0e7c2e`) modules on a white background (white is more reliable than transparent when printed on dark business cards or shared as an image)
- Encoded payload: the absolute profile URL (`https://underwings.org/team/<slug>`)
- Cached via Astro's static prerender (no per-request work in production)

### Page layout (mobile-first)

```
┌──────────────────────────────────┐
│   [Header: existing site nav]    │
├──────────────────────────────────┤
│                                  │
│      [ avatar 160px circle ]     │  ← photo if present, else gradient initials
│                                  │
│         Manoj Prabhakaran        │  ← name, h1
│            Founder               │  ← role
│        [Founder badge]           │  ← if applicable
│      5+ Years in Cybersecurity   │  ← experience line
│                                  │
│  ┌────────────────────────────┐  │
│  │ Save  Email  Call  in  ⤴  │  │  ← action row, icons + labels
│  └────────────────────────────┘  │     (sticky to bottom on mobile)
│                                  │
│  Cybersecurity consultant ...    │  ← bio paragraph
│                                  │
│  [CPTS] [CDSA] [Security+] ...   │  ← certification chips
│                                  │
│  ┌────────────────────────────┐  │
│  │       [ QR code 240px ]    │  │
│  │   Scan to share this card  │  │
│  │       Download QR PNG      │  │  ← link to /team/<slug>/qr.png
│  └────────────────────────────┘  │
│                                  │
│       ← Back to the team         │
├──────────────────────────────────┤
│   [Footer: existing site footer] │
└──────────────────────────────────┘
```

**Action row buttons** (left to right):
1. **Save Contact** → `<a href="/team/<slug>.vcf" download>` — primary green button
2. **Email** → `mailto:<email>`
3. **Call** → `tel:<phone>` — hidden if phone is the placeholder TODO value
4. **LinkedIn** → opens in new tab
5. **Share** → uses `navigator.share()` if available, falls back to copy-to-clipboard

On mobile (`max-width: 720px`) the action row is `position: sticky; bottom: 0` so it stays reachable while scrolling. On desktop it sits inline below the header block.

**Avatar fallback:** if `photo` is undefined, render the same gradient-initials circle that `about.astro` already uses (extract into `<TeamAvatar />` component for reuse).

### Styling

- Reuses the existing `frontend/src/layouts/Layout.astro` (header/footer) and the dark theme + green gradient tokens already in `frontend/src/styles/`
- New CSS scoped to the profile page in the Astro component — no global additions
- Typography matches `/about` team cards (same font sizes, same gradient on the name)
- Respects `prefers-reduced-motion`

### Photos

- Drop into `frontend/public/team/<slug>.jpg` (1:1 ratio, ≥600px, optimised)
- Page checks via Astro `import.meta.glob` at build time; if the file exists, the avatar uses it, otherwise falls back to initials
- Founder will add photos progressively; no code change needed per photo

## SEO & metadata

Per profile page:
- `<title>`: `<Name> — <Role> | Underwings`
- `<meta name="description">`: the short bio
- OpenGraph: `og:type=profile`, `og:title`, `og:description`, `og:image` (photo if present, else default Underwings card)
- JSON-LD: `Person` schema with `worksFor` → `Organization { name: "Underwings", url: "https://underwings.org" }`
- `/about` adds `<a>` wrappers around team cards → boosts internal linking to profiles

## Linking from /about

Each `.about-team-card` div on `/about` becomes a clickable card linking to `/team/<slug>`. Visual change is minimal — add a hover state hint (subtle border/lift) so it's clearly clickable. The CTA button row at the top of the page stays unchanged.

## Error handling

- Unknown slug → standard Astro 404
- vCard endpoint with unknown slug → 404
- QR endpoint with unknown slug → 404
- `navigator.share()` rejected/unavailable → fall back to clipboard copy with a toast "Link copied"

## Testing

- **Build-time check:** `astro build` must succeed with all six profile pages, six vCard files, and six QR PNGs prerendered
- **Manual mobile test:** open `/team/manoj` on a real iPhone and Android device; confirm Save Contact triggers the OS contact sheet; confirm `tel:` and `mailto:` work; confirm QR scans back to the same URL
- **vCard validation:** the generated `.vcf` parses cleanly in iOS Contacts and Google Contacts
- **Lighthouse mobile:** profile page scores ≥ 90 Performance, ≥ 95 Accessibility, ≥ 95 SEO
- **Visual regression:** the existing `/about` page renders identically after the refactor (data import, no layout change)

## Dependencies

- New npm dep: `qrcode` (~50 KB)
- No DB, no API, no auth — fully static

## Placeholder values to fill before launch

The founder will provide, per employee, after the spec is approved:

1. Work email (or confirm pattern `<firstname>@underwings.org`)
2. Mobile phone (E.164)
3. LinkedIn profile URL
4. Optional: professional photo (drop into `/public/team/<slug>.jpg`)

Until provided, `team.ts` ships with `TODO_` -prefixed strings; the page hides Call / LinkedIn / Email buttons whose value still starts with `TODO_`, so nothing visibly broken ships.

## Rollout

1. Merge data refactor + profile pages with TODO placeholders
2. Founder provides real contact data → second small PR replaces TODOs
3. Photos added as they arrive (no code change)
4. Add profile URLs to email signatures, business cards, social bios
