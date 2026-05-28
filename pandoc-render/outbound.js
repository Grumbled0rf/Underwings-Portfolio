'use strict';
/*
 * outbound.js — pure, network-free helpers for the outbound pipeline.
 * Unit-tested in test/outbound.test.js. No I/O here on purpose: everything
 * here is deterministic and testable without Krayin/Claude/Brevo.
 * Spec: docs/superpowers/specs/2026-05-27-outbound-free-oss.md
 */

/** Lower-case, trim, validate a single email. Returns '' if invalid. */
function normEmail(e) {
  const s = String(e || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : '';
}

/**
 * Keep only candidates with a valid email that is neither suppressed nor
 * already in the CRM. `suppressed` and `known` are Sets of lower-case emails.
 */
function filterSuppressed(candidates, suppressed, known) {
  return candidates.filter((c) => {
    const e = normEmail(c.email);
    return e && !suppressed.has(e) && !known.has(e);
  });
}

/** Sends still allowed today for one mailbox. Never negative. */
function capRemaining(dailyCap, sentToday) {
  return Math.max(0, Number(dailyCap) - Number(sentToday));
}

/** Hard score gate: skip leads Claude isn't >=60 confident on. */
function passesScoreGate(scored) {
  const n = Number(scored && scored.score);
  return Number.isFinite(n) && n >= 60;
}

/** A draft is sendable only if it has a subject, body, an unsubscribe and the DPO. */
function validateDraft(draft) {
  const subject = String((draft && draft.subject) || '').trim();
  const body = String((draft && draft.body) || '');
  const hasUnsub = /unsubscribe/i.test(body);
  const hasDpo = /dpo@underwings\.org/i.test(body);
  if (!subject) return { ok: false, reason: 'missing subject' };
  if (body.length < 20) return { ok: false, reason: 'body too short' };
  if (!hasUnsub || !hasDpo) return { ok: false, reason: 'missing unsubscribe/DPO footer' };
  return { ok: true };
}

/** Map a Claude reply label (exact token or free text) to one of the 5 allowed sentiments. */
function normalizeSentiment(raw) {
  const s = String(raw || '').toLowerCase().trim();
  if (['interested', 'not_now', 'never', 'ooo', 'unknown'].includes(s)) return s;
  if (s.includes('never')) return 'never';
  if (s.includes('not now') || s.includes('not_now') || s.includes('later')) return 'not_now';
  if (s.includes('out of office') || s.includes('ooo')) return 'ooo';
  if (s.includes('interest')) return 'interested';
  return 'unknown';
}

module.exports = {
  normEmail,
  filterSuppressed,
  capRemaining,
  passesScoreGate,
  validateDraft,
  normalizeSentiment,
};
