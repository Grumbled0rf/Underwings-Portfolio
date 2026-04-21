// ============================================================
// POST /api/scope-builder
// Receives scope-builder wizard submissions.
//   1. Turnstile CAPTCHA verification (bot protection)
//   2. In-memory rate limiting (5/hr/IP-hash)
//   3. Server-side quote recomputation from raw answers (trust boundary)
//   4. Email dedupe check (7-day window)
//   5. Lead scoring (0-100) → priority team notification
//   6. Saves lead to Supabase `form_submissions`
//   7. Pushes to Krayin CRM webhook
//   8. Emails client personalised scoping brief (HTML + plain text)
//   9. Optional Slack webhook for hot leads
// ============================================================

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import crypto from 'node:crypto';

export const prerender = false;

// ── Config ──────────────────────────────────────────────────────
const smtpTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'stalwart',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER || 'newsletter', pass: process.env.SMTP_PASS || '' },
  tls: { rejectUnauthorized: false },
});

const supabaseUrl        = import.meta.env.PUBLIC_SUPABASE_URL       || process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey    = import.meta.env.PUBLIC_SUPABASE_ANON_KEY  || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

const KRAYIN_WEBHOOK_URL   = import.meta.env.KRAYIN_WEBHOOK_URL   || process.env.KRAYIN_WEBHOOK_URL;
const KRAYIN_WEBHOOK_TOKEN = import.meta.env.KRAYIN_WEBHOOK_TOKEN || process.env.KRAYIN_WEBHOOK_TOKEN;
const TURNSTILE_SECRET     = import.meta.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
const SLACK_WEBHOOK_URL    = import.meta.env.SLACK_WEBHOOK_URL    || process.env.SLACK_WEBHOOK_URL;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Rate limiter — 5 submissions per IP-hash per hour ───────────
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX       = 5;
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ipHash);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ipHash, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip + (process.env.RATE_LIMIT_SALT || 'uw-sb')).digest('hex').slice(0, 32);
}

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true; // verification disabled in dev
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
    });
    const data = await res.json();
    return data.success === true;
  } catch { return false; }
}

// ── Types ──────────────────────────────────────────────────────
type QuoteLine = { key: string; label: string; low: number; high: number };
type Quote = {
  lines: QuoteLine[];
  low: number;
  high: number;
  mid: number;
  bundleDiscount: number;
  sizeMult: number;
  urgent: boolean;
  distinctCategories: number;
  timeline: string;
};
type Assets = {
  network_ext?: boolean;
  network_int?: boolean;
  web?: boolean;
  web_count?: number;
  mobile?: boolean;
  mobile_platform?: string;
  api?: boolean;
  cloud?: boolean;
  cloud_count?: number;
  phishing?: boolean;
  phishing_count?: number;
  va_only?: boolean;
};
type Answers = {
  driver: string;
  framework: string;
  timeline: string;
  size: string;
  assets: Assets;
  consent_marketing?: boolean;
};

// ── Label dictionaries ─────────────────────────────────────────
const DRIVER_LABELS: Record<string, string> = {
  compliance: 'Compliance or audit',
  client_request: 'Enterprise client asked for it',
  product_launch: 'Shipping a new product',
  incident: 'Had an incident or close call',
  unsure: 'Just exploring / not sure',
};
const FRAMEWORK_LABELS: Record<string, string> = {
  iso27001: 'ISO 27001',
  uae_ia:   'UAE IA V2',
  adhics:   'ADHICS v2 (UAE Healthcare)',
  pci_dss:  'PCI DSS',
  soc2:     'SOC 2',
  other:    'Other / not sure',
};
const SIZE_LABELS: Record<string, string> = {
  xs: '1 – 20 employees',
  s:  '20 – 100 employees',
  m:  '100 – 500 employees',
  l:  '500+ employees',
};
const TIMELINE_LABELS: Record<string, string> = {
  urgent:    'Urgent — start within 2 weeks',
  quarter:   'This quarter',
  planning:  'Planning — 3 to 6 months',
  exploring: 'Just exploring',
};

// ── Server-side pricing engine (mirrors client) ────────────────
const PRICES = {
  network_ext:   { low: 20000, high: 45000 },
  network_int:   { low: 35000, high: 65000 },
  web:           { low: 15000, high: 40000 },
  mobile_one:    { low: 18000, high: 35000 },
  mobile_both:   { low: 30000, high: 55000 },
  api:           { low: 15000, high: 35000 },
  cloud:         { low: 12000, high: 25000 },
  phishing_base: { low:  8000, high: 15000 },
  phishing_add:  { low:  3000, high:  5000 },
  va_only:       { low:  5000, high: 15000 },
};
const SIZE_MULT: Record<string, number> = { xs: 0.85, s: 1.0, m: 1.15, l: 1.3 };
const URGENT_MULT = 1.2;

function computeQuote(ans: Answers): Quote {
  const a = ans.assets || {};
  const lines: QuoteLine[] = [];

  if (a.network_ext) lines.push({ key: 'network_ext', label: 'External Network Penetration Test', ...PRICES.network_ext });
  if (a.network_int) lines.push({ key: 'network_int', label: 'Internal Network / Active Directory Pentest', ...PRICES.network_int });

  if (a.web) {
    const n = Math.max(1, Math.min(20, Number(a.web_count) || 1));
    const p = PRICES.web;
    const low  = p.low + (n - 1) * p.low * 0.6;
    const high = p.high + (n - 1) * p.high * 0.6;
    lines.push({ key: 'web', label: n === 1 ? 'Web Application Pentest' : `Web Application Pentest (${n} apps)`, low, high });
  }

  if (a.mobile) {
    if (a.mobile_platform === 'both') {
      lines.push({ key: 'mobile', label: 'Mobile App Pentest (iOS + Android)', ...PRICES.mobile_both });
    } else if (a.mobile_platform === 'ios' || a.mobile_platform === 'android') {
      const plat = a.mobile_platform === 'ios' ? 'iOS' : 'Android';
      lines.push({ key: 'mobile', label: `Mobile App Pentest (${plat} only)`, ...PRICES.mobile_one });
    } else {
      lines.push({ key: 'mobile', label: 'Mobile App Pentest (1 platform)', ...PRICES.mobile_one });
    }
  }

  if (a.api) lines.push({ key: 'api', label: 'API Pentest (OWASP API Top 10)', ...PRICES.api });

  if (a.cloud) {
    const n = Math.max(1, Math.min(3, Number(a.cloud_count) || 1));
    const p = PRICES.cloud;
    lines.push({ key: 'cloud', label: n === 1 ? 'Cloud Configuration Review' : `Cloud Configuration Review (${n} providers)`, low: p.low * n, high: p.high * n });
  }

  if (a.phishing) {
    const emp = Math.max(10, Math.min(10000, Number(a.phishing_count) || 100));
    const extraBlocks = Math.max(0, Math.ceil((emp - 200) / 200));
    const base = PRICES.phishing_base;
    const add  = PRICES.phishing_add;
    lines.push({ key: 'phishing', label: `Phishing Simulation (up to ${emp} employees)`, low: base.low + extraBlocks * add.low, high: base.high + extraBlocks * add.high });
  }

  if (a.va_only) lines.push({ key: 'va_only', label: 'Vulnerability Assessment only', ...PRICES.va_only });

  let low  = lines.reduce((s, l) => s + l.low, 0);
  let high = lines.reduce((s, l) => s + l.high, 0);

  const distinctCategories = lines.filter(l => l.key !== 'va_only').length;
  let bundleDiscount = 0;
  if (distinctCategories >= 3) bundleDiscount = 0.20;
  else if (distinctCategories === 2) bundleDiscount = 0.15;
  if (bundleDiscount > 0) { low *= 1 - bundleDiscount; high *= 1 - bundleDiscount; }

  const sizeMult = SIZE_MULT[ans.size] || 1.0;
  low  *= sizeMult;
  high *= sizeMult;

  const urgent = ans.timeline === 'urgent';
  if (urgent) { low *= URGENT_MULT; high *= URGENT_MULT; }

  // Duration estimate
  const weeks: Record<string, [number, number]> = {
    network_ext: [1, 2], network_int: [2, 3], web: [2, 3], mobile: [1.5, 2],
    api: [1, 2], cloud: [1, 1.5], phishing: [2, 2], va_only: [0.5, 1],
  };
  let wLow = 0, wHigh = 0;
  lines.forEach(l => { const w = weeks[l.key] || [1, 1]; wLow += w[0]; wHigh += w[1]; });
  if (lines.length >= 2) { wLow *= 0.75; wHigh *= 0.8; }
  wLow = Math.max(0.5, wLow); wHigh = Math.max(wLow, wHigh);
  const fmtW = (w: number) => w < 1 ? `${Math.round(w * 7)} days` : (Number.isInteger(w) ? `${w} weeks` : `${w.toFixed(1)} weeks`);
  const timeline = lines.length ? `${fmtW(wLow)} – ${fmtW(wHigh)} end-to-end` : '—';

  return { lines, low, high, mid: (low + high) / 2, bundleDiscount, sizeMult, urgent, distinctCategories, timeline };
}

// ── Lead scoring (0-100) ──────────────────────────────────────
function scoreLead(ans: Answers, quote: Quote): { score: number; priority: 'HOT' | 'WARM' | 'COLD'; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Driver signal (0-30)
  const driverScore: Record<string, number> = { client_request: 30, compliance: 25, incident: 28, product_launch: 20, unsure: 8 };
  score += driverScore[ans.driver] || 10;
  if (ans.driver === 'client_request') reasons.push('Enterprise client requested');
  if (ans.driver === 'incident') reasons.push('Incident-driven');

  // Timeline signal (0-25)
  const timelineScore: Record<string, number> = { urgent: 25, quarter: 18, planning: 10, exploring: 3 };
  score += timelineScore[ans.timeline] || 5;
  if (ans.timeline === 'urgent') reasons.push('Urgent timeline');

  // Company size signal (0-20)
  const sizeScore: Record<string, number> = { xs: 6, s: 12, m: 18, l: 20 };
  score += sizeScore[ans.size] || 8;
  if (ans.size === 'l') reasons.push('Enterprise (500+)');
  else if (ans.size === 'm') reasons.push('Mid-market (100-500)');

  // Scope breadth (0-15)
  score += Math.min(15, quote.distinctCategories * 4);
  if (quote.distinctCategories >= 3) reasons.push(`${quote.distinctCategories} scopes bundled`);

  // Deal size (0-10)
  if (quote.mid >= 80000) { score += 10; reasons.push('High deal value'); }
  else if (quote.mid >= 40000) { score += 7; }
  else if (quote.mid >= 20000) { score += 4; }

  score = Math.min(100, Math.max(0, Math.round(score)));
  const priority: 'HOT' | 'WARM' | 'COLD' = score >= 70 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD';
  return { score, priority, reasons };
}

// ── Helpers ────────────────────────────────────────────────────
const fmtAED = (n: number) => 'AED ' + Math.round(n).toLocaleString('en-US');

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

// Tightened display range: show ±15% around midpoint, rounded.
function displayRange(quote: Quote): { low: number; high: number; mid: number } {
  const mid = quote.mid;
  const margin = 0.15;
  const lo = Math.round(mid * (1 - margin) / 500) * 500;
  const hi = Math.round(mid * (1 + margin) / 500) * 500;
  return { low: lo, high: hi, mid: Math.round(mid / 500) * 500 };
}

// ── Email: client scoping brief (HTML + plain text) ────────────
function buildScopingBriefHTML(name: string, ans: Answers, quote: Quote): string {
  const firstName = (name || 'there').split(' ')[0] || 'there';
  const year = new Date().getFullYear();
  const driverLabel = DRIVER_LABELS[ans.driver] || ans.driver;
  const frameworkLabel = ans.framework ? (FRAMEWORK_LABELS[ans.framework] || ans.framework) : '';
  const sizeLabel = SIZE_LABELS[ans.size] || ans.size;
  const timelineLabel = TIMELINE_LABELS[ans.timeline] || ans.timeline;
  const disp = displayRange(quote);

  const linesHTML = quote.lines.map(l => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#eaeaea;font-size:14px">${esc(l.label)}</td>
      <td align="right" style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.06);color:#37dc82;font-size:14px;font-family:ui-monospace,Menlo,monospace;white-space:nowrap">${fmtAED(l.low)} – ${fmtAED(l.high)}</td>
    </tr>`).join('');

  const modifiers: string[] = [];
  if (quote.bundleDiscount > 0) modifiers.push(`Bundle discount: <strong>-${Math.round(quote.bundleDiscount * 100)}%</strong>`);
  if (quote.sizeMult !== 1) {
    const pct = Math.round((quote.sizeMult - 1) * 100);
    modifiers.push(`Company-size adjustment: <strong>${pct >= 0 ? '+' : ''}${pct}%</strong>`);
  }
  if (quote.urgent) modifiers.push(`Urgent expedite: <strong>+20%</strong>`);
  const modifiersHTML = modifiers.length ? `<p style="margin:12px 0 0;color:#888;font-size:13px;line-height:1.6">${modifiers.join(' · ')}</p>` : '';

  const complianceHTML = ans.driver === 'compliance' && frameworkLabel
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:rgba(36,215,88,.04);border:1px solid rgba(36,215,88,.15);border-radius:12px;padding:18px 22px">
        <p style="margin:0 0 6px;color:#37dc82;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Compliance alignment</p>
        <p style="margin:0;color:#ddd;font-size:14px;line-height:1.6">Report structured to satisfy <strong style="color:#fff">${esc(frameworkLabel)}</strong> — CVSS-scored findings, control mapping, named-tester credentials, re-test evidence. Usable as audit deliverable.</p>
      </td></tr></table>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0"><tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">
  <tr><td align="center" style="padding:0 0 28px"><a href="https://underwings.org"><img src="https://underwings.org/images/logowhiteUW.png" alt="Underwings" style="height:38px;width:auto;background:#0a0a0a;padding:14px 28px;border-radius:12px;display:block"></a></td></tr>
  <tr><td style="background:#111;border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:2px;background:linear-gradient(90deg,transparent 5%,#37dc82 35%,#27dab4 65%,transparent 95%)"></td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <p style="margin:0 0 6px;color:#37dc82;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Your Scoping Brief</p>
      <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 6px">Hi ${esc(firstName)},</h1>
      <p style="color:#888;font-size:14px;margin:0 0 4px">Here's the penetration testing scope we'd recommend based on your answers.</p>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:20px 32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#d4d4d4;font-size:14px;line-height:1.7">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-radius:10px;overflow:hidden;margin:0 0 16px">
        <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Driver</span><br><span style="color:#fff;font-size:14px">${esc(driverLabel)}${frameworkLabel ? ' — ' + esc(frameworkLabel) : ''}</span></td></tr>
        <tr><td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Timeline</span><br><span style="color:#fff;font-size:14px">${esc(timelineLabel)}</span></td></tr>
        <tr><td style="padding:14px 18px"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em">Company size</span><br><span style="color:#fff;font-size:14px">${esc(sizeLabel)}</span></td></tr>
      </table>
      <h3 style="color:#fff;font-size:15px;font-weight:700;margin:24px 0 10px;letter-spacing:.02em">Recommended scope</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden">
        ${linesHTML}
        <tr>
          <td style="padding:14px 14px;background:rgba(55,220,130,.04);color:#fff;font-size:14px;font-weight:700">Total indicative range</td>
          <td align="right" style="padding:14px 14px;background:rgba(55,220,130,.04);color:#37dc82;font-size:16px;font-weight:700;font-family:ui-monospace,Menlo,monospace;white-space:nowrap">${fmtAED(disp.low)} – ${fmtAED(disp.high)}</td>
        </tr>
      </table>
      ${modifiersHTML}
      <p style="color:#888;font-size:12px;line-height:1.6;margin:8px 0 0">Range is ±15% around midpoint <strong>${fmtAED(disp.mid)}</strong>. Written fixed-price quote in 48 hours after scoping call.</p>
      <h3 style="color:#fff;font-size:15px;font-weight:700;margin:28px 0 8px;letter-spacing:.02em">Estimated timeline</h3>
      <p style="color:#ddd;font-size:14px;margin:0">${esc(quote.timeline || '—')}</p>
      ${complianceHTML}
      <h3 style="color:#fff;font-size:15px;font-weight:700;margin:28px 0 12px;letter-spacing:.02em">What's included in every engagement</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        <tr><td style="padding:4px 0;color:#ccc;font-size:14px">• Scoping workshop + rules of engagement</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;font-size:14px">• CVSS-scored findings report + executive summary</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;font-size:14px">• 90-minute live remediation walkthrough with your engineers</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;font-size:14px">• <strong style="color:#fff">Free retest</strong> of critical / high findings within 30 days</td></tr>
        <tr><td style="padding:4px 0;color:#ccc;font-size:14px">• PoC evidence pack (scripts, payloads, reproduction)</td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:rgba(55,220,130,.06);border:1px solid rgba(55,220,130,.22);border-radius:12px;padding:18px 22px">
        <p style="margin:0 0 4px;color:#37dc82;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em">Pilot Partner Programme</p>
        <p style="margin:0;color:#ddd;font-size:14px;line-height:1.6">Early-stage UAE clients can apply for our <strong style="color:#fff">Pilot Partner Programme</strong> — <strong style="color:#fff">25% off</strong> in exchange for case-study participation and quarterly executive briefings. Selection is capped at three partners per service line. Ask about it on the scoping call.</p>
      </td></tr></table>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 16px"><tr><td align="center">
        <a href="https://underwings.org/#contact?service=offensive-security" style="display:inline-block;background:#37dc82;color:#051a0c!important;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">Book a 30-min Scoping Call →</a>
      </td></tr></table>
      <p style="color:#666;font-size:12px;text-align:center;margin:12px 0 0">Reply to this email with questions — it reaches our team instantly.</p>
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:24px 32px"></td></tr></table>
  </td></tr>
  <tr><td style="padding:28px 32px;text-align:center;font-family:-apple-system,sans-serif">
    <p style="margin:0 0 8px;color:#444;font-size:12px">&copy; ${year} Underwings Cybersecurity Solutions</p>
    <p style="margin:0 0 8px;color:#333;font-size:11px">Dubai, UAE</p>
    <p style="margin:0"><a href="https://underwings.org" style="color:#37dc82;font-size:12px;text-decoration:none">underwings.org</a> &nbsp;&middot;&nbsp; <a href="https://www.linkedin.com/company/underwings-technologies" style="color:#555;font-size:12px;text-decoration:none">LinkedIn</a></p>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

function buildScopingBriefText(name: string, ans: Answers, quote: Quote): string {
  const firstName = (name || 'there').split(' ')[0] || 'there';
  const driverLabel = DRIVER_LABELS[ans.driver] || ans.driver;
  const frameworkLabel = ans.framework ? (FRAMEWORK_LABELS[ans.framework] || ans.framework) : '';
  const sizeLabel = SIZE_LABELS[ans.size] || ans.size;
  const timelineLabel = TIMELINE_LABELS[ans.timeline] || ans.timeline;
  const disp = displayRange(quote);
  const lines = quote.lines.map(l => `  • ${l.label}: ${fmtAED(l.low)} – ${fmtAED(l.high)}`).join('\n');
  const mods: string[] = [];
  if (quote.bundleDiscount > 0) mods.push(`Bundle discount: -${Math.round(quote.bundleDiscount * 100)}%`);
  if (quote.sizeMult !== 1) mods.push(`Company size: ${((quote.sizeMult - 1) * 100).toFixed(0)}%`);
  if (quote.urgent) mods.push('Urgent expedite: +20%');

  return `Hi ${firstName},

Here's the penetration testing scope we'd recommend based on your answers.

YOUR ANSWERS
------------
Driver:   ${driverLabel}${frameworkLabel ? ' — ' + frameworkLabel : ''}
Timeline: ${timelineLabel}
Size:     ${sizeLabel}

RECOMMENDED SCOPE
-----------------
${lines}
${mods.length ? '\nModifiers: ' + mods.join(' · ') + '\n' : ''}
TOTAL INDICATIVE RANGE:  ${fmtAED(disp.low)} – ${fmtAED(disp.high)}
Midpoint:                ${fmtAED(disp.mid)}
Estimated timeline:      ${quote.timeline}

WHAT'S INCLUDED
---------------
• Scoping workshop + rules of engagement
• CVSS-scored findings report + executive summary
• 90-min live remediation walkthrough
• Free retest of critical/high findings within 30 days
• PoC evidence pack

PILOT PARTNER PROGRAMME
-----------------------
Early-stage UAE clients can apply for our Pilot Partner Programme — 25% off
in exchange for case-study participation and quarterly executive briefings.
Capped at three partners per service line. Ask about it on the scoping call.

Book a 30-min scoping call:
https://underwings.org/#contact?service=offensive-security

Reply to this email with any questions.

— Underwings Cybersecurity Solutions
  Dubai, UAE · underwings.org
`;
}

// ── Team notification email ───────────────────────────────────
function buildTeamHTML(name: string, email: string, phone: string, company: string, ans: Answers, quote: Quote, lead: { score: number; priority: string; reasons: string[] }, isRepeat: boolean): string {
  const time = new Date().toLocaleString('en-AE', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' });
  const driverLabel = DRIVER_LABELS[ans.driver] || ans.driver;
  const frameworkLabel = ans.framework ? (FRAMEWORK_LABELS[ans.framework] || ans.framework) : '';
  const sizeLabel = SIZE_LABELS[ans.size] || ans.size;
  const timelineLabel = TIMELINE_LABELS[ans.timeline] || ans.timeline;
  const disp = displayRange(quote);

  const tagColor = lead.priority === 'HOT' ? '#ff7a5c' : lead.priority === 'WARM' ? '#37dc82' : '#888';
  const scoreTag = `${lead.priority} · ${lead.score}/100`;

  const linesHTML = quote.lines.map(l => `
    <tr><td style="padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.04);color:#ccc;font-size:13px">${esc(l.label)}</td>
    <td align="right" style="padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.04);color:#37dc82;font-size:13px;font-family:ui-monospace,monospace">${fmtAED(l.low)} – ${fmtAED(l.high)}</td></tr>`).join('');

  const reasonsHTML = lead.reasons.length
    ? `<p style="margin:8px 0 0;color:#aaa;font-size:12px;line-height:1.6">Why ${lead.priority}: ${lead.reasons.map(esc).join(' · ')}</p>` : '';

  const repeatBanner = isRepeat
    ? `<div style="padding:8px 14px;background:rgba(255,180,80,.1);border:1px solid rgba(255,180,80,.3);border-radius:8px;color:#ffb450;font-size:12px;margin-bottom:12px;">⚠ Repeat interest — this email has submitted a quote in the last 7 days.</div>` : '';

  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;-webkit-font-smoothing:antialiased">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 0"><tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">
  <tr><td style="background:#111;border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:3px;background:${tagColor}"></td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><span style="display:inline-block;background:rgba(55,220,130,.1);border:1px solid ${tagColor};border-radius:16px;padding:4px 12px;color:${tagColor};font-size:11px;font-weight:700;letter-spacing:.05em">${scoreTag}</span></td>
        <td align="right"><span style="color:#555;font-size:12px">${esc(time)}</span></td>
      </tr></table>
      <h2 style="color:#fff;font-size:20px;font-weight:700;margin:14px 0 4px">${esc(name || 'Unknown')}</h2>
      <p style="color:#37dc82;font-size:14px;margin:0">${esc(email)}</p>
      ${reasonsHTML}
    </td></tr></table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:0 28px 22px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      ${repeatBanner}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 16px;background:#0a0a0a;border-radius:10px;overflow:hidden">
        ${company ? `<tr><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Company</span><br><span style="color:#fff;font-size:13px">${esc(company)}</span></td></tr>` : ''}
        ${phone ? `<tr><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Phone</span><br><span style="color:#fff;font-size:13px">${esc(phone)}</span></td></tr>` : ''}
        <tr><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Driver</span><br><span style="color:#fff;font-size:13px">${esc(driverLabel)}${frameworkLabel ? ' — ' + esc(frameworkLabel) : ''}</span></td></tr>
        <tr><td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Timeline</span><br><span style="color:#fff;font-size:13px">${esc(timelineLabel)}</span></td></tr>
        <tr><td style="padding:10px 14px"><span style="color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Size</span><br><span style="color:#fff;font-size:13px">${esc(sizeLabel)}</span></td></tr>
      </table>
      <h3 style="color:#fff;font-size:13px;font-weight:700;margin:16px 0 8px;letter-spacing:.03em">Recommended scope</h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid rgba(255,255,255,.06);border-radius:10px;overflow:hidden">
        ${linesHTML}
        <tr><td style="padding:10px 14px;background:rgba(55,220,130,.05);color:#fff;font-size:13px;font-weight:700">Display range (±15%)</td><td align="right" style="padding:10px 14px;background:rgba(55,220,130,.05);color:#37dc82;font-size:14px;font-weight:700;font-family:ui-monospace,monospace">${fmtAED(disp.low)} – ${fmtAED(disp.high)}</td></tr>
      </table>
      <p style="color:#777;font-size:12px;margin:8px 0 0">Timeline: ${esc(quote.timeline || '—')}${quote.urgent ? ' · <strong style="color:#ff7a5c">URGENT</strong>' : ''} · Midpoint ${fmtAED(disp.mid)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0"><tr>
        <td><a href="https://crm.underwings.org/admin" style="display:inline-block;background:#37dc82;color:#051a0c!important;font-weight:700;font-size:12px;padding:9px 22px;border-radius:8px;text-decoration:none">Open in CRM</a></td>
        <td align="right"><a href="mailto:${esc(email)}" style="display:inline-block;background:#1a1a1a;border:1px solid rgba(255,255,255,.1);color:#fff!important;font-weight:600;font-size:12px;padding:9px 22px;border-radius:8px;text-decoration:none">Reply</a></td>
      </tr></table>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:14px 28px;text-align:center;font-family:-apple-system,sans-serif">
    <p style="margin:0;color:#333;font-size:11px">Underwings · Scope Builder · ${scoreTag}</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

// ── Krayin CRM push ──────────────────────────────────────────
async function pushToKrayin(data: { name: string; email: string; phone: string; company: string; message: string }): Promise<void> {
  if (!KRAYIN_WEBHOOK_URL || !KRAYIN_WEBHOOK_TOKEN) return;
  try {
    await fetch(KRAYIN_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Token': KRAYIN_WEBHOOK_TOKEN },
      body: JSON.stringify({ name: data.name || 'Unknown', email: data.email, phone: data.phone || '', company: data.company || '', service: 'Offensive Security — Scope Builder', message: data.message || '' }),
    });
  } catch (e) { console.error('Krayin push error:', e); }
}

// ── Slack webhook for hot leads (env-gated) ──────────────────
async function pushToSlack(name: string, email: string, company: string, ans: Answers, quote: Quote, lead: { score: number; priority: string; reasons: string[] }): Promise<void> {
  if (!SLACK_WEBHOOK_URL) return;
  if (lead.priority === 'COLD') return; // only WARM+HOT go to Slack
  const disp = displayRange(quote);
  const emoji = lead.priority === 'HOT' ? '🔥' : '🟢';
  const reasons = lead.reasons.length ? ` _(${lead.reasons.join(' · ')})_` : '';
  const payload = {
    text: `${emoji} *${lead.priority}* lead · ${lead.score}/100 — ${name} @ ${company || '?'}\n` +
          `💰 ${fmtAED(disp.low)} – ${fmtAED(disp.high)} · ⏱ ${quote.timeline}\n` +
          `📧 ${email}\n` +
          `📋 Driver: ${DRIVER_LABELS[ans.driver] || ans.driver}${ans.framework ? ' · ' + (FRAMEWORK_LABELS[ans.framework] || ans.framework) : ''}${reasons}`,
  };
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) { console.error('Slack push error:', e); }
}

// ── Dedupe: check same-email quote in last 7 days ────────────
async function checkDuplicate(email: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('form_submissions')
      .select('id')
      .eq('email', email)
      .eq('form_type', 'quote')
      .gte('created_at', sevenDaysAgo)
      .limit(1);
    return Array.isArray(data) && data.length > 0;
  } catch { return false; }
}

// ── Validate payload ─────────────────────────────────────────
function validate(body: any): { ok: true; name: string; email: string; company: string; phone: string; answers: Answers; turnstileToken: string; consent_marketing: boolean } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid payload' };
  const email = String(body.email || '').trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) return { ok: false, error: 'Invalid email' };
  const name = String(body.name || '').trim().slice(0, 100);
  if (!name) return { ok: false, error: 'Name required' };
  const company = String(body.company || '').trim().slice(0, 100);
  if (!company) return { ok: false, error: 'Company required' };
  const phone = String(body.phone || '').trim().slice(0, 30);
  const turnstileToken = String(body['cf-turnstile-response'] || '').slice(0, 2048);
  const consent_marketing = Boolean(body.consent_marketing);

  const a = body.answers;
  if (!a || typeof a !== 'object') return { ok: false, error: 'Missing answers' };

  const answers: Answers = {
    driver: String(a.driver || '').slice(0, 50),
    framework: String(a.framework || '').slice(0, 50),
    timeline: String(a.timeline || '').slice(0, 50),
    size: String(a.size || '').slice(0, 10),
    assets: (a.assets && typeof a.assets === 'object') ? {
      network_ext: Boolean(a.assets.network_ext),
      network_int: Boolean(a.assets.network_int),
      web: Boolean(a.assets.web),
      web_count: Number(a.assets.web_count) || 1,
      mobile: Boolean(a.assets.mobile),
      mobile_platform: String(a.assets.mobile_platform || '').slice(0, 10),
      api: Boolean(a.assets.api),
      cloud: Boolean(a.assets.cloud),
      cloud_count: Number(a.assets.cloud_count) || 1,
      phishing: Boolean(a.assets.phishing),
      phishing_count: Number(a.assets.phishing_count) || 100,
      va_only: Boolean(a.assets.va_only),
    } : {},
    consent_marketing,
  };

  return { ok: true, name, email, company, phone, answers, turnstileToken, consent_marketing };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    // ── Rate limit ──
    const ip = clientAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = hashIp(ip);
    if (!checkRateLimit(ipHash)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const v = validate(body);
    if (!v.ok) return new Response(JSON.stringify({ error: v.error }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    // ── Turnstile verify ──
    if (TURNSTILE_SECRET) {
      const ok = await verifyTurnstile(v.turnstileToken);
      if (!ok) return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const { name, email, company, phone, answers, consent_marketing } = v;

    // ── Server-side quote recompute (trust boundary) ──
    const quote = computeQuote(answers);
    if (quote.lines.length === 0) {
      return new Response(JSON.stringify({ error: 'No scope selected' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // ── Lead score ──
    const lead = scoreLead(answers, quote);

    // ── Dedupe check ──
    const isRepeat = await checkDuplicate(email);

    // ── Prepare CRM summary ──
    const disp = displayRange(quote);
    const scopeSummary = quote.lines.map(l => l.label).join('; ');
    const messageForCRM = `[${lead.priority} · ${lead.score}/100] Driver: ${DRIVER_LABELS[answers.driver] || answers.driver}` +
      (answers.framework ? ` · Framework: ${FRAMEWORK_LABELS[answers.framework] || answers.framework}` : '') +
      `\nTimeline: ${TIMELINE_LABELS[answers.timeline] || answers.timeline}` +
      `\nSize: ${SIZE_LABELS[answers.size] || answers.size}` +
      `\nScope: ${scopeSummary}` +
      `\nIndicative range: ${fmtAED(disp.low)} – ${fmtAED(disp.high)} (mid ${fmtAED(disp.mid)})` +
      `\nEst. duration: ${quote.timeline}` +
      (lead.reasons.length ? `\nScoring: ${lead.reasons.join(' · ')}` : '') +
      (isRepeat ? `\n⚠ Repeat interest (submitted within 7 days)` : '');

    // ── Fan-out side effects ──
    const ops: Promise<unknown>[] = [];

    if (supabase) {
      ops.push(supabase.from('form_submissions').insert({
        form_type: 'quote',
        name: name || null,
        email,
        phone: phone || null,
        company: company || null,
        message: messageForCRM,
        service_interest: 'Offensive Security',
        budget_range: `${fmtAED(disp.low)} - ${fmtAED(disp.high)}`,
        timeline: TIMELINE_LABELS[answers.timeline] || answers.timeline,
        status: 'new',
        metadata: { source: 'scope_builder', answers, quote, lead, isRepeat, consent_marketing },
      }));
    }

    ops.push(pushToKrayin({ name, email, phone, company, message: messageForCRM }));

    const briefHTML = buildScopingBriefHTML(name, answers, quote);
    const briefText = buildScopingBriefText(name, answers, quote);

    ops.push(smtpTransport.sendMail({
      from: 'Underwings <newsletter@underwings.org>',
      replyTo: 'contact@underwings.org',
      to: email,
      subject: 'Your penetration testing scoping brief — Underwings',
      html: briefHTML,
      text: briefText,
    }).catch(e => console.error('Client email error:', e)));

    ops.push(smtpTransport.sendMail({
      from: 'Underwings CRM <newsletter@underwings.org>',
      to: 'contact@underwings.org',
      subject: `${lead.priority === 'HOT' ? '🔥 HOT' : lead.priority === 'WARM' ? '🟢 Warm' : 'Cold'} (${lead.score}/100) · ${name || 'Unknown'} · ${fmtAED(disp.low)}–${fmtAED(disp.high)}${isRepeat ? ' · ⚠ Repeat' : ''}`,
      html: buildTeamHTML(name, email, phone, company, answers, quote, lead, isRepeat),
    }).catch(e => console.error('Team email error:', e)));

    ops.push(pushToSlack(name, email, company, answers, quote, lead));

    await Promise.all(ops);

    return new Response(JSON.stringify({
      success: true,
      quote: {
        low: disp.low,
        high: disp.high,
        mid: disp.mid,
        lines: quote.lines,
        timeline: quote.timeline,
        bundleDiscount: quote.bundleDiscount,
        sizeMult: quote.sizeMult,
        urgent: quote.urgent,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Scope Builder API error:', err);
    return new Response(JSON.stringify({ error: 'Submission failed' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
