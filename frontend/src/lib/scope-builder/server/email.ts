import nodemailer from 'nodemailer';
import { fmtRange } from '../format';
import type { CartItem, UniversalComments } from '../cart';
import type { BundleResult } from '../bundle';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'stalwart',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER || 'newsletter@underwings.org',
    pass: process.env.SMTP_PASS || '',
  },
});

const WA = '971505670394';
const TEAM = process.env.TEAM_EMAIL || 'itdept1@gcee.ae';
const KRAYIN_BASE = 'https://crm.underwings.org/admin/leads/view';

interface SendInput {
  reference: string;
  token: string;
  cart: CartItem[];
  bundle: BundleResult;
  comments: UniversalComments;
  founding_optin: boolean;
  lead: { name: string; email: string; company: string; phone?: string; whatsapp_ok: boolean; best_time?: string };
  pdfBytes: Buffer;
  krayin_lead_id?: number;
  origin: string;
}

export async function sendBuyerEmail(d: SendInput): Promise<void> {
  const itemRows = d.cart.map((i) => `<tr><td>${esc(i.summary)}</td><td style="text-align:right">${fmtRange(i.range.low, i.range.high)}</td></tr>`).join('');
  const subject = `Your scope plan: ${d.reference} · ${fmtRange(d.bundle.adjusted.low, d.bundle.adjusted.high)}`;
  const hosted = `${d.origin}/scope/${d.token}`;
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(`Question about scope ${d.reference}`)}`;
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:640px;margin:0 auto;padding:24px">
    <h2 style="color:#0a3a1f">Hi ${esc(d.lead.name)} — your scope plan is ready</h2>
    <p>Reference: <strong>${esc(d.reference)}</strong></p>
    <table style="width:100%;border-collapse:collapse">${itemRows}</table>
    <p style="font-size:18px;font-weight:700;color:#0a3a1f">Estimated range: ${fmtRange(d.bundle.adjusted.low, d.bundle.adjusted.high)}</p>
    ${d.founding_optin ? `<div style="background:#fff7d6;padding:12px;border-radius:6px;border:1px solid #f0c14b">★ <strong>Founding Client offer noted</strong> — we will lead with this on the scoping call.</div>` : ''}
    <p>The full PDF is attached. You can also <a href="${hosted}">view it online</a> any time.</p>
    <p>
      <a href="${hosted}" style="background:#24d758;color:#0a0a0a;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">View online</a>
      &nbsp;
      <a href="${wa}" style="background:#25d366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;display:inline-block">Ask on WhatsApp</a>
    </p>
    <p style="color:#666;font-size:12px">We will email you within 48 hours with a written fixed-price quote.</p>
  </div>`;
  await transporter.sendMail({
    from: `"Underwings Quotes" <quotes@underwings.org>`,
    to: d.lead.email,
    subject,
    html,
    attachments: [{ filename: `${d.reference}.pdf`, content: d.pdfBytes, contentType: 'application/pdf' }],
  });
}

export async function sendTeamEmail(d: SendInput): Promise<void> {
  const subject = `[NEW SCOPE] ${d.lead.company} — ${fmtRange(d.bundle.adjusted.low, d.bundle.adjusted.high)} · ${d.cart.length} services${d.founding_optin ? ' · ★ FOUNDING CLIENT' : ''}`;
  const itemRows = d.cart.map((i) => `<tr><td>${esc(i.category)}</td><td>${esc(i.summary)}</td><td>${fmtRange(i.range.low, i.range.high)}</td><td>${esc(i.comments || '')}</td></tr>`).join('');
  const universal = [
    d.comments.worry    && `<p><strong>Worry:</strong> ${esc(d.comments.worry)}</p>`,
    d.comments.deadline && `<p><strong>Deadline:</strong> ${esc(d.comments.deadline)}</p>`,
    d.comments.existing && `<p><strong>Existing tools:</strong> ${esc(d.comments.existing)}</p>`,
    d.comments.other    && `<p><strong>Other:</strong> ${esc(d.comments.other)}</p>`,
  ].filter(Boolean).join('');
  const krayin = d.krayin_lead_id ? `${KRAYIN_BASE}/${d.krayin_lead_id}` : null;
  const hosted = `${d.origin}/scope/${d.token}`;
  const html = `<div style="font-family:-apple-system,sans-serif;max-width:780px">
    <h2>New scope: ${esc(d.reference)}</h2>
    ${d.founding_optin ? `<div style="background:#fff7d6;padding:8px 12px;border:1px solid #f0c14b;border-radius:4px;font-weight:700">★ FOUNDING CLIENT OPT-IN — lead with discount on call</div>` : ''}
    <p><strong>${esc(d.lead.name)}</strong> · ${esc(d.lead.company)} · <a href="mailto:${esc(d.lead.email)}">${esc(d.lead.email)}</a>${d.lead.phone ? ' · ' + esc(d.lead.phone) : ''}${d.lead.whatsapp_ok ? ' (WhatsApp OK)' : ''}${d.lead.best_time ? ' · best time: ' + esc(d.lead.best_time) : ''}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px">
      <thead><tr><th>Category</th><th>Summary</th><th>Range</th><th>Note</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>
    <p style="margin-top:12px"><strong>Bundle:</strong> ${fmtRange(d.bundle.adjusted.low, d.bundle.adjusted.high)} (${d.bundle.signal || 'no bundle savings'})</p>
    ${universal ? `<h3>Universal comments</h3>${universal}` : ''}
    <h3>Links</h3>
    <p>Hosted scope: <a href="${hosted}">${hosted}</a><br>${krayin ? `Krayin lead: <a href="${krayin}">${krayin}</a>` : 'Krayin lead: (creation pending or failed)'}</p>
  </div>`;
  await transporter.sendMail({
    from: `"Underwings Scope" <noreply@underwings.org>`,
    to: TEAM,
    subject,
    html,
    attachments: [{ filename: `${d.reference}.pdf`, content: d.pdfBytes, contentType: 'application/pdf' }],
  });
}

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
