'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  buildOverpassQL,
  pickDomains,
  extractEmails,
  guessEmails,
  osmElementsToCandidates,
} = require('../lead-sources');

test('buildOverpassQL targets a category within a country area', () => {
  const ql = buildOverpassQL('hospital', 'AE');
  assert.match(ql, /\[out:json\]/);
  assert.match(ql, /ISO3166-1"="AE"/);
  assert.match(ql, /"amenity"="hospital"/);
  assert.match(ql, /out tags center 200/);
});

test('pickDomains extracts unique www-stripped hostnames', () => {
  const items = [
    { link: 'https://www.acme.ae/contact' },
    { link: 'https://acme.ae/about' },
    { link: 'http://beta.example.com/x' },
    { link: 'not a url' },
  ];
  assert.deepStrictEqual(pickDomains(items), ['acme.ae', 'beta.example.com']);
});

test('extractEmails finds mailto + inline, dedup + lowercased, drops noise', () => {
  const html = '<a href="mailto:Info@Acme.ae">m</a> ceo@acme.ae also info@acme.ae logo@cdn.png';
  assert.deepStrictEqual(extractEmails(html).sort(), ['ceo@acme.ae', 'info@acme.ae']);
});

test('guessEmails builds common B2B patterns', () => {
  const out = guessEmails('Jane', 'Doe', 'www.acme.ae');
  assert.ok(out.includes('jane.doe@acme.ae'));
  assert.ok(out.includes('jdoe@acme.ae'));
  assert.ok(out.includes('jane@acme.ae'));
});

test('guessEmails returns [] without a domain', () => {
  assert.deepStrictEqual(guessEmails('Jane', 'Doe', ''), []);
});

test('osmElementsToCandidates maps tags + requires a name', () => {
  const els = [
    { tags: { name: 'Lifeline Hospital', website: 'https://life.ae', email: 'X@life.ae' } },
    { tags: { amenity: 'hospital' } }, // no name → dropped
    { tags: { 'name:en': 'Beta Clinic', 'contact:phone': '+9715' } },
  ];
  const out = osmElementsToCandidates(els);
  assert.strictEqual(out.length, 2);
  assert.strictEqual(out[0].company, 'Lifeline Hospital');
  assert.strictEqual(out[0].email, 'x@life.ae');
  assert.strictEqual(out[1].company, 'Beta Clinic');
});
