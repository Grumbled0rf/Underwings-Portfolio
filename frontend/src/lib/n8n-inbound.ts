/**
 * Shared client for posting inbound events to n8n's lead-capture webhook.
 * All form handlers (contact, newsletter, waitlist, scope-builder) call this.
 *
 * The workflow at https://n8n.underwings.org/webhook/inbound-lead handles:
 *  - X-Inbound-Token auth
 *  - Source -> Krayin pipeline/stage/source/type ID resolution
 *  - Lead + person + organization creation in Krayin
 *  - Slack #new-leads ping (when credential configured)
 *
 * Fire-and-forget: errors are logged but never thrown — form submissions
 * must never fail because the CRM is unreachable.
 */

const N8N_INBOUND_URL   = import.meta.env.N8N_INBOUND_URL   || process.env.N8N_INBOUND_URL;
const N8N_INBOUND_TOKEN = import.meta.env.N8N_INBOUND_TOKEN || process.env.N8N_INBOUND_TOKEN;

export type InboundSource =
  | 'contact_form'
  | 'scope_builder'
  | 'scope_builder_quiz'
  | 'adhics_readiness_quiz'
  | 'iso27001_gap_quiz'
  | 'newsletter'
  | 'waitlist'
  | 'partners'
  | 'linkedin_manoj' | 'linkedin_nelson' | 'linkedin_vinoth'
  | 'cold_email_manoj' | 'cold_email_nelson' | 'cold_email_vinoth'
  | 'apollo' | 'referral' | 'whatsapp';

export interface InboundPayload {
  source: InboundSource;
  person: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    job_title?: string;
  };
  title?: string;
  description?: string;
  lead_value?: number;
  activity_note?: string;
  icp_segment_option_id?: number;
  attributes?: Record<string, string | number>;
}

export async function notifyN8nInbound(payload: InboundPayload): Promise<void> {
  if (!N8N_INBOUND_URL || !N8N_INBOUND_TOKEN) {
    console.warn('[n8n-inbound] env not configured; skipping push');
    return;
  }
  try {
    const res = await fetch(N8N_INBOUND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Inbound-Token': N8N_INBOUND_TOKEN,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`[n8n-inbound] non-2xx response: ${res.status} ${await res.text().catch(() => '')}`);
    }
  } catch (e) {
    console.error('[n8n-inbound] push failed:', e);
  }
}
