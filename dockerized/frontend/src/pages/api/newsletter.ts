import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const HUBSPOT_PORTAL_ID = '147940148';
const HUBSPOT_NEWSLETTER_FORM_GUID = '48612ae2-0011-4bba-b2d3-9fa1770f515b';
const HUBSPOT_API_URL = `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_NEWSLETTER_FORM_GUID}`;
const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

// Supabase client for saving subscribers locally
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)
  : null;

async function verifyTurnstile(token: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) return true;
  if (!token) return false;
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
  });
  const data = await res.json();
  return data.success === true;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, lead_magnet } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length < 5) {
      return new Response(JSON.stringify({ error: 'Valid email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify Turnstile CAPTCHA only if a token was submitted
    if (TURNSTILE_SECRET) {
      const turnstileToken = body['cf-turnstile-response'];
      if (turnstileToken && !await verifyTurnstile(turnstileToken)) {
        return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 1. Save to Supabase subscribers table
    let supabaseOk = false;
    if (supabase) {
      const { error: dbError } = await supabase
        .from('subscribers')
        .upsert(
          {
            email: email.toLowerCase().trim(),
            subscription_source: lead_magnet ? `lead_magnet:${lead_magnet}` : 'newsletter',
            subscribed: true,
          },
          { onConflict: 'email' }
        );

      if (dbError) {
        console.error('Supabase subscriber save error:', dbError.message);
      } else {
        supabaseOk = true;
      }
    }

    // 2. Submit to HubSpot for email workflow (welcome email, nurture sequence)
    const helpText = lead_magnet
      ? `Lead Magnet: ${lead_magnet}`
      : 'Newsletter Subscription';

    const hubspotPayload = {
      fields: [
        { name: 'email', value: email },
        { name: 'what_can_we_help_with_', value: helpText },
      ],
      context: {
        pageUri: request.headers.get('referer') || 'https://underwings.org',
        pageName: lead_magnet ? `Lead Magnet: ${lead_magnet}` : 'Newsletter Signup',
      },
      legalConsentOptions: {
        consent: {
          consentToProcess: true,
          text: 'I agree to receive cybersecurity updates from Underwings Cybersecurity Solutions.',
        },
      },
    };

    const hubspotRes = await fetch(HUBSPOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hubspotPayload),
    });

    // If HubSpot succeeds OR Supabase saved successfully, it's a success
    if (hubspotRes.ok || supabaseOk) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Both failed
    const hubspotError = await hubspotRes.text();
    console.error('HubSpot newsletter error:', hubspotRes.status, hubspotError);

    return new Response(JSON.stringify({ error: 'Subscription failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Newsletter API error:', err);
    return new Response(JSON.stringify({ error: 'Subscription failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
