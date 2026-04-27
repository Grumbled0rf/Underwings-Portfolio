import type { CartItem, UniversalComments } from '../cart';
import { fmtRange } from '../format';

const KRAYIN_BASE = process.env.KRAYIN_URL || 'https://crm.underwings.org';
const TOKEN = process.env.KRAYIN_WEBHOOK_TOKEN || process.env.WEBHOOK_TOKEN || '';

export async function createScopeLead(d: {
  reference: string; token: string;
  name: string; email: string; company: string; phone?: string;
  range_low: number; range_high: number;
  founding_optin: boolean;
  cart: CartItem[]; comments: UniversalComments;
  whatsapp_ok: boolean;
}): Promise<{ lead_id: number | null; person_id: number | null; error?: string }> {
  if (!TOKEN) return { lead_id: null, person_id: null, error: 'no token' };
  try {
    const res = await fetch(`${KRAYIN_BASE}/webhook-scope.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Token': TOKEN },
      body: JSON.stringify({
        scope_token: d.token,
        scope_reference: d.reference,
        name: d.name, email: d.email, company: d.company, phone: d.phone || '',
        range_low: d.range_low, range_high: d.range_high,
        founding_optin: d.founding_optin,
        whatsapp_ok: d.whatsapp_ok,
        cart_summary: JSON.stringify(d.cart.map((i) => ({ category: i.category, summary: i.summary, range: i.range, comments: i.comments }))),
        title: `${d.founding_optin ? '[FC] ' : ''}${d.company} — ${d.cart.length} services — ${fmtRange(d.range_low, d.range_high)}`,
        description: d.cart.map((i) => `• ${i.summary} ${fmtRange(i.range.low, i.range.high)}${i.comments ? ' — ' + i.comments : ''}`).join('\n')
          + (d.comments.worry || d.comments.deadline || d.comments.existing || d.comments.other
              ? '\n\nNotes:\n' + [
                  d.comments.worry    && `- Worry: ${d.comments.worry}`,
                  d.comments.deadline && `- Deadline: ${d.comments.deadline}`,
                  d.comments.existing && `- Existing: ${d.comments.existing}`,
                  d.comments.other    && `- Other: ${d.comments.other}`,
                ].filter(Boolean).join('\n')
              : ''),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { lead_id: null, person_id: null, error: json.error || `HTTP ${res.status}` };
    return { lead_id: json.lead_id ?? null, person_id: json.person_id ?? null };
  } catch (e) {
    return { lead_id: null, person_id: null, error: String(e) };
  }
}

export async function logScopeView(d: {
  scope_token: string; ip?: string; user_agent?: string; city?: string; country?: string; referer?: string;
}): Promise<void> {
  if (!TOKEN) return;
  try {
    await fetch(`${KRAYIN_BASE}/webhook-scope-view.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Token': TOKEN },
      body: JSON.stringify(d),
    });
  } catch (e) {
    console.error('Krayin view ping failed:', e);
  }
}
