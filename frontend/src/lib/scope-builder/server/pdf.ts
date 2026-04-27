import { fmtRange } from '../format';
import type { CartItem, UniversalComments } from '../cart';
import type { BundleResult } from '../bundle';

interface PdfInput {
  reference: string;
  token: string;
  cart: CartItem[];
  bundle: BundleResult;
  comments: UniversalComments;
  founding_optin: boolean;
  lead: { name: string; email: string; company: string };
  expires_at: Date;
}

export function buildScopePdfHtml(d: PdfInput): string {
  const itemsHtml = d.cart.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb">
        <div style="font-weight:600">${escape(i.summary)}</div>
        ${i.comments ? `<div style="color:#666;font-size:12px;margin-top:4px">Note: ${escape(i.comments)}</div>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums">
        ${fmtRange(i.range.low, i.range.high)}
      </td>
    </tr>`).join('');

  const commentsHtml = [
    d.comments.worry    && `<p><strong>Specific concern:</strong> ${escape(d.comments.worry)}</p>`,
    d.comments.deadline && `<p><strong>Deadline:</strong> ${escape(d.comments.deadline)}</p>`,
    d.comments.existing && `<p><strong>Existing tools:</strong> ${escape(d.comments.existing)}</p>`,
    d.comments.other    && `<p><strong>Other notes:</strong> ${escape(d.comments.other)}</p>`,
  ].filter(Boolean).join('');

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #111; max-width: 720px; margin: 32px auto; padding: 0 24px; font-size: 14px; line-height: 1.5; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #0a3a1f; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .08em; color: #0a3a1f; margin: 28px 0 8px; }
  table { width: 100%; border-collapse: collapse; }
  .meta { color: #666; font-size: 12px; }
  .total { font-size: 18px; font-weight: 700; color: #0a3a1f; }
  .founding { background: #fff7d6; border: 1px solid #f0c14b; border-radius: 6px; padding: 12px 16px; margin: 16px 0; }
</style></head><body>
  <h1>Scope Plan — ${escape(d.reference)}</h1>
  <div class="meta">${escape(d.lead.company)} · ${escape(d.lead.name)} · ${escape(d.lead.email)} · Generated ${new Date().toLocaleDateString('en-AE')}</div>

  <h2>Recommended Plan</h2>
  <table>${itemsHtml}</table>

  <table style="margin-top:16px">
    <tr><td>Subtotal range</td><td style="text-align:right">${fmtRange(d.bundle.subtotal.low, d.bundle.subtotal.high)}</td></tr>
    ${d.bundle.savings_pct > 0 ? `<tr><td>${escape(d.bundle.signal)}</td><td style="text-align:right">−${d.bundle.savings_pct}%</td></tr>` : ''}
    <tr><td class="total">Adjusted range</td><td class="total" style="text-align:right">${fmtRange(d.bundle.adjusted.low, d.bundle.adjusted.high)}</td></tr>
  </table>

  ${d.founding_optin ? `<div class="founding"><strong>★ Founding Client opt-in noted.</strong> We will lead with our 10–30% discount on the scoping call in exchange for a published case study.</div>` : ''}

  ${commentsHtml ? `<h2>Your Notes</h2>${commentsHtml}` : ''}

  <h2>Next Steps</h2>
  <p>1. We review your scope and prepare a written fixed-price quote within 48 hours.<br>
  2. We schedule a 30-min scoping call to confirm assumptions.<br>
  3. We send a signed engagement letter and start work the following week.</p>

  <h2>Quote Reference</h2>
  <p>Reference: <strong>${escape(d.reference)}</strong> · Valid until ${d.expires_at.toLocaleDateString('en-AE')} · View online at <code>https://underwings.org/scope/${escape(d.token)}</code></p>

  <div class="meta" style="margin-top:32px">Underwings Cybersecurity Solutions · United Arab Emirates · underwings.org</div>
</body></html>`;
}

function escape(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export async function renderPdf(html: string): Promise<Buffer> {
  const url   = process.env.PDF_RENDER_URL   || 'http://pdf-render:3000';
  const token = process.env.PDF_RENDER_TOKEN || '';
  const res = await fetch(url + '/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shared-Token': token },
    body: JSON.stringify({ html }),
  });
  if (!res.ok) throw new Error(`pdf-render returned ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}
