'use strict';
/*
 * lead-sources.js — pure builders/parsers for the FREE lead sources.
 * No network here: the functions build queries and parse responses so they
 * can be unit-tested without hitting OSM/Google/websites.
 * Spec: docs/superpowers/specs/2026-05-27-outbound-free-oss.md
 */

/** Overpass QL: businesses of `category` inside a country's admin area. */
function buildOverpassQL(category, iso = 'AE', limit = 200) {
  const cat = String(category).replace(/["\\]/g, '');
  return `[out:json][timeout:60];
area["ISO3166-1"="${iso}"][admin_level=2]->.c;
(node["amenity"="${cat}"](area.c);
 way["amenity"="${cat}"](area.c);
 node["office"="${cat}"](area.c);
 way["office"="${cat}"](area.c););
out tags center ${Number(limit) || 200};`;
}

/** Unique hostnames (www-stripped) from Google CSE result items. */
function pickDomains(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    try {
      const h = new URL(it.link).hostname.replace(/^www\./, '');
      if (!seen.has(h)) { seen.add(h); out.push(h); }
    } catch { /* skip bad URL */ }
  }
  return out;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** All emails in a page (mailto + inline), lower-cased + unique, asset-noise dropped. */
function extractEmails(html) {
  const found = (String(html || '').match(EMAIL_RE) || []).map((e) => e.toLowerCase());
  const clean = found.filter(
    (e) => !/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e) && !e.endsWith('example.com') && !e.endsWith('sentry.io')
  );
  return [...new Set(clean)];
}

/** Common B2B email patterns for a person at a domain. */
function guessEmails(first, last, domain) {
  const f = String(first || '').toLowerCase().replace(/[^a-z]/g, '');
  const l = String(last || '').toLowerCase().replace(/[^a-z]/g, '');
  const d = String(domain || '').toLowerCase().replace(/^www\./, '');
  if (!d) return [];
  const out = new Set();
  if (f && l) {
    out.add(`${f}.${l}@${d}`);
    out.add(`${f[0]}${l}@${d}`);
    out.add(`${f}${l}@${d}`);
    out.add(`${f}_${l}@${d}`);
  }
  if (f) out.add(`${f}@${d}`);
  return [...out];
}

/** Map raw Overpass elements → candidate rows. */
function osmElementsToCandidates(elements) {
  return (elements || [])
    .map((el) => {
      const t = el.tags || {};
      return {
        company: t.name || t['name:en'] || '',
        website: t.website || t['contact:website'] || '',
        email: (t.email || t['contact:email'] || '').toLowerCase(),
        phone: t.phone || t['contact:phone'] || '',
      };
    })
    .filter((c) => c.company); // a business needs at least a name
}

module.exports = {
  buildOverpassQL,
  pickDomains,
  extractEmails,
  guessEmails,
  osmElementsToCandidates,
};
