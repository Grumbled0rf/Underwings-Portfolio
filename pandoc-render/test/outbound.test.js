'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  normEmail,
  filterSuppressed,
  capRemaining,
  passesScoreGate,
  validateDraft,
  normalizeSentiment,
} = require('../outbound');

test('normEmail lowercases/trims valid, rejects invalid', () => {
  assert.strictEqual(normEmail('  A@B.com '), 'a@b.com');
  assert.strictEqual(normEmail('noatsign'), '');
  assert.strictEqual(normEmail('a@b'), '');
  assert.strictEqual(normEmail(null), '');
});

test('filterSuppressed removes suppressed + already-known (case-insensitive)', () => {
  const candidates = [
    { email: 'New@Acme.com', company: 'Acme' },
    { email: 'sup@x.com', company: 'X' },
    { email: 'known@y.com', company: 'Y' },
  ];
  const out = filterSuppressed(candidates, new Set(['sup@x.com']), new Set(['known@y.com']));
  assert.deepStrictEqual(out.map((c) => c.email), ['New@Acme.com']);
});

test('filterSuppressed drops rows with no/invalid email', () => {
  const out = filterSuppressed([{ email: '' }, { email: 'noatsign' }, { email: 'ok@z.com' }], new Set(), new Set());
  assert.deepStrictEqual(out.map((c) => c.email), ['ok@z.com']);
});

test('capRemaining never negative', () => {
  assert.strictEqual(capRemaining(25, 0), 25);
  assert.strictEqual(capRemaining(25, 20), 5);
  assert.strictEqual(capRemaining(25, 30), 0);
});

test('passesScoreGate enforces >= 60', () => {
  assert.strictEqual(passesScoreGate({ score: 60 }), true);
  assert.strictEqual(passesScoreGate({ score: 59 }), false);
  assert.strictEqual(passesScoreGate({ score: null }), false);
});

test('validateDraft requires subject, body length, unsubscribe + DPO', () => {
  const good = { subject: 'Hi', body: 'Hello there.\nUnsubscribe: x\ndpo@underwings.org' };
  assert.strictEqual(validateDraft(good).ok, true);
  assert.strictEqual(validateDraft({ subject: '', body: good.body }).ok, false);
  assert.strictEqual(validateDraft({ subject: 'Hi', body: 'no footer here at all' }).ok, false);
});

test('normalizeSentiment maps to the 5 allowed values', () => {
  assert.strictEqual(normalizeSentiment('Interested!'), 'interested');
  assert.strictEqual(normalizeSentiment('not now please'), 'not_now');
  assert.strictEqual(normalizeSentiment('NEVER contact me'), 'never');
  assert.strictEqual(normalizeSentiment('I am out of office'), 'ooo');
  assert.strictEqual(normalizeSentiment('garbage'), 'unknown');
});
