import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, rateLimitResponse, getClientIP } from '../../lib/rate-limit';

export const prerender = false;

// Rate limit: 5 submissions per 15 minutes per IP
const CONTACT_RATE_LIMIT = { windowMs: 900_000, maxRequests: 5 };

const HUBSPOT_PORTAL_ID = '147940148';
const HUBSPOT_FORM_GUID = '838aa154-ee64-47e0-a6bf-4d20c5408ca5';
const HUBSPOT_API_URL = `https://api-eu1.hsforms.com/submissions/v3/integration/submit/${HUBSPOT_PORTAL_ID}/${HUBSPOT_FORM_GUID}`;
const TURNSTILE_SECRET = import.meta.env.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;

// Supabase for saving form submissions locally
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
  const ip = getClientIP(request);
  const { allowed, retryAfterMs } = checkRateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT);
  if (!allowed) return rateLimitResponse(retryAfterMs);

  try {
    const body = await request.json();

    // Verify Turnstile CAPTCHA if configured
    if (TURNSTILE_SECRET) {
      const turnstileToken = body['cf-turnstile-response'];
      if (!await verifyTurnstile(turnstileToken)) {
        return new Response(JSON.stringify({ error: 'CAPTCHA verification failed' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      delete body['cf-turnstile-response'];
    }

    // Extract fields from HubSpot form payload
    const fields: Record<string, string> = {};
    if (body.fields && Array.isArray(body.fields)) {
      for (const f of body.fields) {
        fields[f.name] = f.value;
      }
    }

    // 1. Save to Supabase form_submissions table
    if (supabase && fields.email) {
      const { error: dbError } = await supabase
        .from('form_submissions')
        .insert({
          form_type: 'contact',
          name: fields.firstname || fields.name || null,
          email: fields.email,
          phone: fields.phone || null,
          company: fields.company || null,
          message: fields.what_can_we_help_with_ || fields.message || null,
          service_interest: fields.service_interest || null,
          status: 'new',
        });

      if (dbError) {
        console.error('Supabase form save error:', dbError.message);
      }
    }

    // 2. Submit to HubSpot for CRM + email notification workflow
    const hubspotRes = await fetch(HUBSPOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await hubspotRes.text();

    if (hubspotRes.ok) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.error('HubSpot contact error:', hubspotRes.status, data);
    return new Response(JSON.stringify({ error: 'Submission failed' }), {
      status: hubspotRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact API error:', err);
    return new Response(JSON.stringify({ error: 'Submission failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
