import { fmtRange } from '../format';

export async function notifyNewScope(d: {
  reference: string; range_low: number; range_high: number; n_services: number;
  company: string; founding_optin: boolean;
  krayin_url: string | null; hosted_url: string;
}): Promise<void> {
  const url = process.env.SLACK_SCOPE_WEBHOOK;
  if (!url) return;
  const text = `🌟 *New scope* · ${fmtRange(d.range_low, d.range_high)} · ${d.n_services} services\n` +
    `Company: ${d.company}\n` +
    `Founding-Client: ${d.founding_optin ? 'YES ★' : 'no'}\n` +
    (d.krayin_url ? `<${d.krayin_url}|Open in Krayin>` : '') +
    `\n<${d.hosted_url}|Hosted scope>`;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  } catch (e) {
    console.error('Slack notify failed:', e);
  }
}

export async function notifyView(d: {
  reference: string; city?: string; country?: string; view_count: number;
}): Promise<void> {
  const url = process.env.SLACK_SCOPE_WEBHOOK;
  if (!url) return;
  const text = `📊 *Scope viewed* · ${d.reference} · ${d.city || '?'}, ${d.country || '?'} · view #${d.view_count}`;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  } catch (e) {
    console.error('Slack notify failed:', e);
  }
}
